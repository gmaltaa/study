// POST /api/lessons/:id/complete — terminou a aula (conteúdo e exercícios).
//
// Grava o progresso com os acertos da PRIMEIRA tentativa de cada exercício,
// fecha o item da sessão (e a sessão, se era o último), atualiza a sequência de
// dias e conclui o tema quando era a última aula da trilha.
import { z } from 'zod'
import { badRequest, json, notFound, readJson, withAuth, zodMessage } from '@/lib/http'
import { todayFor } from '@/lib/requests'
import { streakAfterStudy } from '@/lib/streak'
import { activeSubjects, studyDaysOfUser } from '@/lib/today'

const input = z.object({ sessionId: z.string().uuid().nullable().optional() })

export const POST = withAuth<{ id: string }>(async ({ supabase, userId, request, params }) => {
  const parsed = input.safeParse(await readJson(request).catch(() => ({})))
  if (!parsed.success) throw badRequest(zodMessage(parsed.error))
  const { today } = await todayFor(request, supabase, userId)

  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('id, path_id, learning_paths(subject_id)')
    .eq('id', params.id)
    .maybeSingle()
  if (error) throw error
  if (!lesson) throw notFound('Aula')
  const subjectId = (lesson as unknown as { learning_paths: { subject_id: string } }).learning_paths.subject_id

  // Acertos: só a primeira resposta de cada exercício conta.
  const { data: exercises } = await supabase.from('exercises').select('id').eq('lesson_id', lesson.id)
  const exerciseIds = (exercises ?? []).map((e) => e.id as string)
  const { data: attempts } = exerciseIds.length
    ? await supabase.from('exercise_attempts').select('exercise_id, is_correct, answered_at')
      .in('exercise_id', exerciseIds).order('answered_at', { ascending: true })
    : { data: [] }
  const first = new Map<string, boolean>()
  for (const a of (attempts ?? []) as { exercise_id: string; is_correct: boolean }[]) {
    if (!first.has(a.exercise_id)) first.set(a.exercise_id, a.is_correct)
  }

  const now = new Date().toISOString()
  const { error: e2 } = await supabase.from('lesson_progress').upsert({
    user_id: userId,
    lesson_id: lesson.id,
    subject_id: subjectId,
    status: 'completed',
    completed_at: now,
    correct_count: [...first.values()].filter(Boolean).length,
    total_count: exerciseIds.length,
  }, { onConflict: 'user_id,lesson_id' })
  if (e2) throw e2

  // O item da sessão: a informada, ou a de hoje que tem esta aula.
  let sessionId = parsed.data.sessionId ?? null
  if (!sessionId) {
    const { data: s } = await supabase
      .from('study_sessions')
      .select('id, session_items!inner(lesson_id)')
      .eq('scheduled_date', today)
      .eq('session_items.lesson_id', lesson.id)
      .limit(1)
      .maybeSingle()
    sessionId = (s?.id as string | undefined) ?? null
  }
  let sessionCompleted = false
  let nextInSession: string | null = null
  if (sessionId) {
    await supabase.from('session_items').update({ completed_at: now })
      .eq('session_id', sessionId).eq('lesson_id', lesson.id).is('completed_at', null)
    const { data: items } = await supabase
      .from('session_items').select('lesson_id, position, completed_at').eq('session_id', sessionId).order('position')
    const pending = ((items ?? []) as { lesson_id: string; completed_at: string | null }[]).filter((i) => !i.completed_at)
    nextInSession = pending[0]?.lesson_id ?? null
    if (pending.length === 0) {
      sessionCompleted = true
      await supabase.from('study_sessions').update({ status: 'completed', completed_at: now }).eq('id', sessionId)
    } else {
      await supabase.from('study_sessions').update({ status: 'in_progress' }).eq('id', sessionId).eq('status', 'planned')
    }
  }

  // Sequência de dias.
  const { data: profile } = await supabase
    .from('profiles').select('current_streak, longest_streak, last_study_date').eq('id', userId).single()
  const subjects = await activeSubjects(supabase)
  const next = streakAfterStudy({
    current: (profile?.current_streak as number) ?? 0,
    longest: (profile?.longest_streak as number) ?? 0,
    lastStudyDate: (profile?.last_study_date as string | null) ?? null,
  }, today, await studyDaysOfUser(supabase, subjects))
  await supabase.from('profiles').update({
    current_streak: next.current, longest_streak: next.longest, last_study_date: next.lastStudyDate,
  }).eq('id', userId)

  // Última aula da trilha: o tema está concluído.
  const [{ count: total }, { count: done }] = await Promise.all([
    supabase.from('lessons').select('id', { count: 'exact', head: true }).eq('path_id', lesson.path_id),
    supabase.from('lesson_progress').select('lesson_id', { count: 'exact', head: true })
      .eq('subject_id', subjectId).eq('status', 'completed'),
  ])
  const subjectCompleted = !!total && (done ?? 0) >= total
  if (subjectCompleted) {
    await supabase.from('subjects').update({ status: 'completed', updated_at: now }).eq('id', subjectId).eq('status', 'active')
  }

  return json({
    sessionCompleted,
    nextInSession,
    subjectCompleted,
    correct: [...first.values()].filter(Boolean).length,
    total: exerciseIds.length,
    streak: { current: next.current, longest: next.longest },
  })
})
