// lib/today.ts — o dia de hoje: congelar as sessões e montar a tela "Hoje".
//
// Na primeira leitura do dia, as sessões de hoje de cada tema ativo saem do
// cronograma calculado e são GRAVADAS. A partir daí não mudam mais no dia (o
// usuário não vê a aula trocar de lugar enquanto estuda) e viram histórico.
//
// Sessões de dias anteriores que ficaram por fazer viram `missed`. As aulas
// delas continuam pendentes e caem nas próximas sessões: nada acumula.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ISODate } from '@/lib/dates'
import { dayOfWeek } from '@/lib/dates'
import {
  completedLessons, frozenToday, latestAvailabilities, lessonsOfPaths, projectSchedule,
  SUBJECT_COLUMNS, type SubjectRow,
} from '@/lib/domain'
import { visibleStreak } from '@/lib/streak'

export async function activeSubjects(db: SupabaseClient): Promise<SubjectRow[]> {
  const { data, error } = await db
    .from('subjects')
    .select(SUBJECT_COLUMNS)
    .eq('status', 'active')
    .is('archived_at', null)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as SubjectRow[]
}

export async function freezeToday(db: SupabaseClient, userId: string, today: ISODate): Promise<void> {
  await db
    .from('study_sessions')
    .update({ status: 'missed' })
    .eq('user_id', userId)
    .lt('scheduled_date', today)
    .in('status', ['planned', 'in_progress'])

  const subjects = await activeSubjects(db)
  if (subjects.length === 0) return
  const ids = subjects.map((s) => s.id)
  const [availabilities, frozen] = await Promise.all([latestAvailabilities(db, ids), frozenToday(db, ids, today)])

  const pending = subjects.filter((s) => {
    const a = availabilities.get(s.id)
    return a && !frozen.has(s.id) && s.active_path_id
      && a.days_of_week.includes(dayOfWeek(today)) && a.start_date <= today
  })
  if (pending.length === 0) return

  const [lessons, completed] = await Promise.all([
    lessonsOfPaths(db, pending.map((s) => s.active_path_id!)),
    completedLessons(db, pending.map((s) => s.id)),
  ])

  for (const s of pending) {
    const schedule = projectSchedule({
      lessons: lessons.get(s.active_path_id!) ?? [],
      completed: completed.get(s.id) ?? new Set(),
      frozenToday: undefined,
      todayFrozen: false,
      availability: availabilities.get(s.id)!,
      today,
    })
    const todays = schedule.sessions.filter((x) => x.date === today)
    if (todays.length === 0) continue

    // `ignoreDuplicates`: duas aberturas simultâneas não criam a sessão duas
    // vezes. Só a que inseriu de fato recebe as linhas de volta e grava os itens.
    const { data: inserted, error } = await db
      .from('study_sessions')
      .upsert(
        todays.map((x) => ({
          subject_id: s.id, user_id: userId, scheduled_date: today, slot: x.slot, planned_minutes: x.minutes,
        })),
        { onConflict: 'subject_id,scheduled_date,slot', ignoreDuplicates: true },
      )
      .select('id, slot')
    if (error) throw error
    const bySlot = new Map(((inserted ?? []) as { id: string; slot: number }[]).map((r) => [r.slot, r.id]))
    const minutesById = new Map((lessons.get(s.active_path_id!) ?? []).map((l) => [l.id, l.estimated_minutes]))
    const items = todays.flatMap((x) => {
      const sessionId = bySlot.get(x.slot)
      if (!sessionId) return []
      return x.lessonIds.map((lessonId, i) => ({
        session_id: sessionId, user_id: userId, position: i + 1, kind: 'lesson',
        lesson_id: lessonId, planned_minutes: minutesById.get(lessonId) ?? 0,
      }))
    })
    if (items.length) {
      const { error: e2 } = await db.from('session_items').insert(items)
      if (e2) throw e2
    }
  }
}

export interface TodaySession {
  id: string
  slot: number
  plannedMinutes: number
  status: 'planned' | 'in_progress' | 'completed' | 'missed'
  isExtra: boolean
  subject: { id: string; title: string; icon: string; color: string }
  lessons: { id: string; title: string; minutes: number; completed: boolean; ready: boolean }[]
}

export async function readToday(db: SupabaseClient, today: ISODate): Promise<TodaySession[]> {
  const { data, error } = await db
    .from('study_sessions')
    .select('id, slot, planned_minutes, status, is_extra, subjects(id, title, icon, color, status, archived_at), session_items(position, lesson_id, completed_at, planned_minutes, lessons(id, title, content_status))')
    .eq('scheduled_date', today)
    .order('slot')
  if (error) throw error
  type Row = {
    id: string; slot: number; planned_minutes: number; status: TodaySession['status']; is_extra: boolean
    subjects: { id: string; title: string; icon: string; color: string; status: string; archived_at: string | null }
    session_items: { position: number; lesson_id: string; completed_at: string | null; planned_minutes: number; lessons: { id: string; title: string; content_status: string } }[]
  }
  return ((data ?? []) as unknown as Row[])
    // Tema pausado ou arquivado depois de congelar o dia sai da tela.
    .filter((r) => r.subjects && r.subjects.status === 'active' && !r.subjects.archived_at)
    .map((r) => ({
      id: r.id,
      slot: r.slot,
      plannedMinutes: r.planned_minutes,
      status: r.status,
      isExtra: r.is_extra,
      subject: { id: r.subjects.id, title: r.subjects.title, icon: r.subjects.icon, color: r.subjects.color },
      lessons: [...r.session_items]
        .sort((a, b) => a.position - b.position)
        .map((i) => ({
          id: i.lessons.id,
          title: i.lessons.title,
          minutes: i.planned_minutes,
          completed: !!i.completed_at,
          ready: i.lessons.content_status === 'ready',
        })),
    }))
}

/** Dias da semana com estudo em algum tema ativo (para a sequência). */
export async function studyDaysOfUser(db: SupabaseClient, subjects: SubjectRow[]): Promise<Set<number>> {
  const availabilities = await latestAvailabilities(db, subjects.map((s) => s.id))
  const days = new Set<number>()
  for (const a of availabilities.values()) for (const d of a.days_of_week) days.add(d)
  return days
}

export async function streakOf(db: SupabaseClient, userId: string, today: ISODate, subjects: SubjectRow[]) {
  const { data } = await db
    .from('profiles')
    .select('current_streak, longest_streak, last_study_date')
    .eq('id', userId)
    .single()
  const p = data as { current_streak: number; longest_streak: number; last_study_date: string | null } | null
  const state = { current: p?.current_streak ?? 0, longest: p?.longest_streak ?? 0, lastStudyDate: p?.last_study_date ?? null }
  return {
    current: visibleStreak(state, today, await studyDaysOfUser(db, subjects)),
    longest: state.longest,
    studiedToday: state.lastStudyDate === today,
  }
}
