// lib/inngest/functions.ts — os jobs em segundo plano.
//
//  - generatePath: estrutura da trilha (módulos, depois as aulas de cada módulo
//    em paralelo). Leva de 30 s a 2 min, por isso não roda na requisição.
//  - generateLesson: conteúdo e exercícios de uma aula, com revisão de precisão
//    nos temas factuais.
//  - pregenerateLessons: deixa prontas as aulas dos próximos 2 dias de estudo.
//  - sendReminders: lembrete no horário escolhido, se a sessão do dia não foi feita.
//
// Cada `step.run` é um passo com retry próprio: se o módulo 4 falhar, só ele é
// refeito. Os passos de gravação apagam antes de inserir, então repetir um
// passo não duplica nada.
import { adminClient } from '@/lib/supabase'
import { inngest, EVENTS } from '@/lib/inngest/client'
import { MODELS, PROMPT_VERSION } from '@/lib/ai/models'
import { generateLessonContent, generateModuleLessons, generateModules, reviewAccuracy } from '@/lib/ai/generate'
import type { FittedLesson, FittedModule, NormalizedContent } from '@/lib/ai/validate'
import { loadLessonInput, requestLessonContent } from '@/lib/lessons'
import {
  completedLessons, latestAvailabilities, learnerInput, lessonsOfPaths, projectSchedule,
  SUBJECT_COLUMNS, type SubjectRow,
} from '@/lib/domain'
import { dayOfWeek, partsIn } from '@/lib/dates'
import { assertDailyQuota } from '@/lib/limits'
import { sendPushToUsers } from '@/lib/push'

/**
 * Teto de execuções simultâneas por função. O plano grátis do Inngest aceita
 * no máximo 5, e um valor acima disso impede o app de sincronizar. Subir aqui
 * quando o plano mudar.
 *
 * O Inngest conta PASSOS, não execuções: os módulos de uma trilha rodam em
 * paralelo, e cada um ocupa uma vaga. Por isso a geração da trilha não tem
 * limite por usuário (seria um módulo de cada vez); quem segura o abuso é a
 * cota diária e o limite de temas ativos.
 */
const PLAN_CONCURRENCY = 5

interface PathEventData { userId: string; subjectId: string; pathId: string }
interface LessonEventData { userId: string; lessonId: string }

// ─── Trilha ────────────────────────────────────────────────────────────────

async function loadPathContext(pathId: string) {
  const db = adminClient()
  const { data: path, error } = await db
    .from('learning_paths')
    .select('id, subject_id, budget_minutes, lesson_max_minutes, adjustment_request')
    .eq('id', pathId)
    .single()
  if (error) throw error
  const { data: subject, error: e2 } = await db.from('subjects').select(SUBJECT_COLUMNS).eq('id', path.subject_id).single()
  if (e2) throw e2
  // No ajuste, a IA vê os módulos da versão anterior.
  let previousModules: string[] | null = null
  if (path.adjustment_request) {
    const { data: prev } = await db
      .from('learning_paths')
      .select('id, modules(title, position)')
      .eq('subject_id', path.subject_id)
      .eq('status', 'ready')
      .neq('id', pathId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()
    const mods = (prev as { modules: { title: string; position: number }[] } | null)?.modules ?? []
    previousModules = mods.sort((a, b) => a.position - b.position).map((m) => m.title)
  }
  return {
    learner: learnerInput(subject as SubjectRow),
    budgetMinutes: path.budget_minutes as number,
    lessonMaxMinutes: path.lesson_max_minutes as number,
    adjustment: (path.adjustment_request as string | null) ?? null,
    previousModules,
  }
}

async function savePath(p: PathEventData, modules: FittedModule[], lessonsPerModule: FittedLesson[][]) {
  const db = adminClient()
  await db.from('modules').delete().eq('path_id', p.pathId)
  const { data: insertedModules, error } = await db
    .from('modules')
    .insert(modules.map((m, i) => ({
      path_id: p.pathId, user_id: p.userId, position: i + 1,
      title: m.title, objective: m.objective, builds_on: m.builds_on,
    })))
    .select('id, position')
  if (error) throw error
  const moduleIdByPosition = new Map((insertedModules ?? []).map((m) => [m.position as number, m.id as string]))

  let position = 0
  const lessons = lessonsPerModule.flatMap((list, i) => list.map((l) => ({
    module_id: moduleIdByPosition.get(i + 1)!,
    path_id: p.pathId,
    user_id: p.userId,
    position: ++position,
    title: l.title,
    objectives: l.objectives,
    key_concepts: l.key_concepts,
    estimated_minutes: l.minutes,
  })))
  const { error: e2 } = await db.from('lessons').insert(lessons)
  if (e2) throw e2

  const total = lessons.reduce((sum, l) => sum + l.estimated_minutes, 0)
  await db.from('learning_paths').update({
    status: 'ready', total_minutes: total, model: MODELS.path,
    prompt_version: `${PROMPT_VERSION.path_modules}+${PROMPT_VERSION.module_lessons}`, failure_reason: null,
  }).eq('id', p.pathId)
  await db.from('learning_paths').update({ status: 'superseded' })
    .eq('subject_id', p.subjectId).eq('status', 'ready').neq('id', p.pathId)
  await db.from('subjects').update({
    status: 'review', active_path_id: p.pathId, failure_reason: null, updated_at: new Date().toISOString(),
  }).eq('id', p.subjectId)
  return { modules: modules.length, lessons: lessons.length, totalMinutes: total }
}

export const generatePath = inngest.createFunction(
  {
    id: 'generate-path',
    retries: 2,
    concurrency: { limit: PLAN_CONCURRENCY },
    triggers: [{ event: EVENTS.generatePath }],
    onFailure: async ({ event, error }) => {
      const p = event.data.event.data as PathEventData
      const db = adminClient()
      await db.from('learning_paths')
        .update({ status: 'failed', failure_reason: String(error?.message ?? error).slice(0, 300) })
        .eq('id', p.pathId)
      // Ajuste que falhou: volta para a versão anterior, que continua válida.
      const { data: previous } = await db
        .from('learning_paths')
        .select('id')
        .eq('subject_id', p.subjectId)
        .eq('status', 'ready')
        .neq('id', p.pathId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()
      await db.from('subjects').update(previous
        ? { status: 'review', active_path_id: previous.id, failure_reason: 'Não conseguimos ajustar a trilha. A versão anterior continua valendo.' }
        : { status: 'failed', failure_reason: 'Não conseguimos montar a sua trilha. Tente de novo.' },
      ).eq('id', p.subjectId)
    },
  },
  async ({ event, step }) => {
    const p = event.data as PathEventData
    const ctx = await step.run('load', () => loadPathContext(p.pathId))
    const modules = (await step.run('modules', () => generateModules(p, {
      ...ctx.learner,
      budgetMinutes: ctx.budgetMinutes,
      lessonMaxMinutes: ctx.lessonMaxMinutes,
      adjustment: ctx.adjustment,
      previousModules: ctx.previousModules,
    }))) as FittedModule[]
    const lessonsPerModule = (await Promise.all(modules.map((_, index) =>
      step.run(`lessons-${index + 1}`, () => generateModuleLessons(p, {
        ...ctx.learner, modules, index, lessonMaxMinutes: ctx.lessonMaxMinutes,
      })),
    ))) as FittedLesson[][]
    return step.run('save', () => savePath(p, modules, lessonsPerModule))
  },
)

// ─── Aula ──────────────────────────────────────────────────────────────────

async function saveLessonContent(p: LessonEventData, content: NormalizedContent, reviewed: boolean) {
  const db = adminClient()
  await db.from('exercises').delete().eq('lesson_id', p.lessonId)
  const { error } = await db.from('exercises').insert(content.exercises.map((e) => ({
    lesson_id: p.lessonId, user_id: p.userId, position: e.position, kind: e.kind,
    prompt: e.prompt, options: e.options, correct_option_id: e.correct_option_id, concept: e.concept,
  })))
  if (error) throw error
  const { error: e2 } = await db.from('lessons').update({
    content: content.blocks, summary: content.summary, content_status: 'ready', reviewed,
    model: MODELS.lesson, prompt_version: PROMPT_VERSION.lesson_content, generated_at: new Date().toISOString(),
  }).eq('id', p.lessonId)
  if (e2) throw e2
}

export const generateLesson = inngest.createFunction(
  {
    id: 'generate-lesson',
    retries: 2,
    concurrency: [{ key: 'event.data.userId', limit: 2 }, { limit: PLAN_CONCURRENCY }],
    triggers: [{ event: EVENTS.generateLesson }],
    onFailure: async ({ event }) => {
      const p = event.data.event.data as LessonEventData
      await adminClient().from('lessons').update({ content_status: 'failed' }).eq('id', p.lessonId)
    },
  },
  async ({ event, step }) => {
    const p = event.data as LessonEventData
    const loaded = await step.run('load', () => loadLessonInput(adminClient(), p.lessonId))
    if (!loaded || loaded.contentStatus === 'ready') return { skipped: true }
    const meta = { userId: p.userId, subjectId: loaded.subject.id }

    let content = (await step.run('content', () => generateLessonContent(meta, loaded.input))) as NormalizedContent
    let reviewed = false
    if (loaded.subject.topic_profile?.accuracy_sensitivity === 'high') {
      const issues = await step.run('review', () =>
        reviewAccuracy({ ...meta, lessonId: p.lessonId }, loaded.subject.title, loaded.input.lesson.title, content))
      reviewed = true
      if (issues.length) {
        content = (await step.run('fix', () => generateLessonContent(meta, loaded.input, issues))) as NormalizedContent
      }
    }
    await step.run('save', () => saveLessonContent(p, content, reviewed))
    return { exercises: content.exercises.length, reviewed }
  },
)

// ─── Pré-geração ───────────────────────────────────────────────────────────

/** Quantos dias de estudo à frente ficam prontos. */
const PREGENERATE_STUDY_DAYS = 2

async function pregenerateFor(subjects: SubjectRow[]) {
  const db = adminClient()
  const withPath = subjects.filter((s) => s.active_path_id)
  if (withPath.length === 0) return 0
  const ids = withPath.map((s) => s.id)
  const userIds = [...new Set(withPath.map((s) => s.user_id))]
  const [availabilities, lessons, completed, { data: profiles }] = await Promise.all([
    latestAvailabilities(db, ids),
    lessonsOfPaths(db, withPath.map((s) => s.active_path_id!)),
    completedLessons(db, ids),
    db.from('profiles').select('id, timezone').in('id', userIds),
  ])
  const tzOf = new Map(((profiles ?? []) as { id: string; timezone: string }[]).map((p) => [p.id, p.timezone]))
  const overQuota = new Set<string>()
  let requested = 0

  for (const s of withPath) {
    const availability = availabilities.get(s.id)
    if (!availability || overQuota.has(s.user_id)) continue
    const pathLessons = lessons.get(s.active_path_id!) ?? []
    const schedule = projectSchedule({
      lessons: pathLessons,
      completed: completed.get(s.id) ?? new Set(),
      frozenToday: undefined,
      todayFrozen: false,
      availability,
      today: partsIn(tzOf.get(s.user_id) ?? 'America/Sao_Paulo').date,
    })
    const dates = [...new Set(schedule.sessions.map((x) => x.date))].slice(0, PREGENERATE_STUDY_DAYS)
    const upcoming = new Set(schedule.sessions.filter((x) => dates.includes(x.date)).flatMap((x) => x.lessonIds))
    const toRequest = pathLessons.filter((l) => upcoming.has(l.id) && l.content_status !== 'ready')
    for (const l of toRequest) {
      try {
        await assertDailyQuota(s.user_id, 'lesson')
      } catch {
        overQuota.add(s.user_id)
        break
      }
      if (await requestLessonContent(s.user_id, l.id)) requested++
    }
  }
  return requested
}

export const pregenerateLessons = inngest.createFunction(
  {
    id: 'pregenerate-lessons',
    triggers: [{ cron: '0 */2 * * *' }, { event: EVENTS.subjectActivated }],
  },
  async ({ event, step }) => {
    const subjects = await step.run('subjects', async () => {
      let q = adminClient().from('subjects').select(SUBJECT_COLUMNS).eq('status', 'active').is('archived_at', null)
      if (event.name === EVENTS.subjectActivated) q = q.eq('id', (event.data as { subjectId: string }).subjectId)
      const { data, error } = await q.limit(1000)
      if (error) throw error
      return (data ?? []) as SubjectRow[]
    })
    const requested = await step.run('request', () => pregenerateFor(subjects as SubjectRow[]))
    return { subjects: subjects.length, requested }
  },
)

// ─── Lembretes ─────────────────────────────────────────────────────────────

/** Janela do cron: o lembrete sai no primeiro disparo depois do horário. */
const REMINDER_WINDOW_MIN = 15

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export const sendReminders = inngest.createFunction(
  { id: 'send-reminders', triggers: [{ cron: '*/15 * * * *' }] },
  async ({ step }) => step.run('send', async () => {
    const db = adminClient()
    const { data: subjects, error } = await db
      .from('subjects').select(SUBJECT_COLUMNS).eq('status', 'active').is('archived_at', null).limit(5000)
    if (error) throw error
    const list = (subjects ?? []) as SubjectRow[]
    if (list.length === 0) return { sent: 0 }
    const availabilities = await latestAvailabilities(db, list.map((s) => s.id))
    const { data: profiles } = await db.from('profiles').select('id, timezone').in('id', [...new Set(list.map((s) => s.user_id))])
    const tzOf = new Map(((profiles ?? []) as { id: string; timezone: string }[]).map((p) => [p.id, p.timezone]))

    const due: { subject: SubjectRow; date: string }[] = []
    for (const s of list) {
      const a = availabilities.get(s.id)
      if (!a?.reminder_time) continue
      const now = partsIn(tzOf.get(s.user_id) ?? 'America/Sao_Paulo')
      const late = toMinutes(now.time) - toMinutes(a.reminder_time.slice(0, 5))
      if (late < 0 || late >= REMINDER_WINDOW_MIN) continue
      if (s.reminded_on === now.date || a.start_date > now.date) continue
      if (!a.days_of_week.includes(dayOfWeek(now.date))) continue
      due.push({ subject: s, date: now.date })
    }
    if (due.length === 0) return { sent: 0 }

    // Quem já concluiu tudo de hoje naquele tema não recebe lembrete.
    const { data: sessions } = await db
      .from('study_sessions')
      .select('subject_id, scheduled_date, status')
      .in('subject_id', due.map((d) => d.subject.id))
      .in('scheduled_date', [...new Set(due.map((d) => d.date))])
    const done = new Set<string>()
    const pendingToday = new Set<string>()
    for (const r of (sessions ?? []) as { subject_id: string; scheduled_date: string; status: string }[]) {
      const key = `${r.subject_id}:${r.scheduled_date}`
      if (r.status === 'completed') done.add(key)
      else pendingToday.add(key)
    }
    const toRemind = due.filter((d) => {
      const key = `${d.subject.id}:${d.date}`
      return !done.has(key) || pendingToday.has(key)
    })

    const titlesByUser = new Map<string, string[]>()
    for (const d of toRemind) {
      const list = titlesByUser.get(d.subject.user_id) ?? []
      list.push(`${d.subject.icon} ${d.subject.title}`)
      titlesByUser.set(d.subject.user_id, list)
    }
    await sendPushToUsers(db, [...titlesByUser.keys()], (userId) => {
      const titles = titlesByUser.get(userId) ?? []
      if (titles.length === 0) return null
      return {
        title: 'Hora de estudar',
        body: titles.length === 1 ? `${titles[0]}: sua sessão de hoje está pronta.` : `Hoje tem ${titles.join(', ')}.`,
        data: { url: '/' },
      }
    })
    for (const d of due) await db.from('subjects').update({ reminded_on: d.date }).eq('id', d.subject.id)
    return { sent: toRemind.length }
  }),
)

export const functions = [generatePath, generateLesson, pregenerateLessons, sendReminders]
