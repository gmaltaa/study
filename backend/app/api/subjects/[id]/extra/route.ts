// POST /api/subjects/:id/extra — "estudar mais uma": cria uma sessão extra hoje
// com a próxima aula pendente. O cronograma dos próximos dias se ajusta sozinho.
import { badRequest, json, withAuth } from '@/lib/http'
import { todayFor } from '@/lib/requests'
import { completedLessons, frozenToday, lessonsOfPaths, loadSubject } from '@/lib/domain'
import { rateLimit } from '@/lib/limits'

export const POST = withAuth<{ id: string }>(async ({ supabase, userId, request, params }) => {
  rateLimit(`extra:${userId}`, 10)
  const subject = await loadSubject(supabase, params.id)
  if (subject.status !== 'active' || !subject.active_path_id) throw badRequest('Esse tema não está ativo.', 'invalid_state')
  const { today } = await todayFor(request, supabase, userId)

  const [lessons, completed, frozen] = await Promise.all([
    lessonsOfPaths(supabase, [subject.active_path_id]),
    completedLessons(supabase, [subject.id]),
    frozenToday(supabase, [subject.id], today),
  ])
  const done = completed.get(subject.id) ?? new Set<string>()
  const taken = frozen.get(subject.id) ?? new Set<string>()
  const pendingToday = [...taken].filter((id) => !done.has(id))
  if (pendingToday.length) throw badRequest('Termine as aulas de hoje antes de adiantar a próxima.', 'today_pending')
  const next = (lessons.get(subject.active_path_id) ?? []).find((l) => !done.has(l.id) && !taken.has(l.id))
  if (!next) throw badRequest('Não há mais aulas nesta trilha.', 'path_finished')

  const { data: last } = await supabase
    .from('study_sessions')
    .select('slot')
    .eq('subject_id', subject.id)
    .eq('scheduled_date', today)
    .order('slot', { ascending: false })
    .limit(1)
    .maybeSingle()
  const { data: session, error } = await supabase
    .from('study_sessions')
    .insert({
      subject_id: subject.id, user_id: userId, scheduled_date: today,
      slot: ((last?.slot as number | undefined) ?? 0) + 1,
      planned_minutes: next.estimated_minutes, is_extra: true,
    })
    .select('id')
    .single()
  if (error) throw error
  const { error: e2 } = await supabase.from('session_items').insert({
    session_id: session.id, user_id: userId, position: 1, kind: 'lesson',
    lesson_id: next.id, planned_minutes: next.estimated_minutes,
  })
  if (e2) throw e2
  return json({ sessionId: session.id, lessonId: next.id }, { status: 201 })
})
