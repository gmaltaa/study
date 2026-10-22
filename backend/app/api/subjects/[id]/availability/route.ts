// PUT /api/subjects/:id/availability — muda dias, tempo e lembrete.
//
// O cronograma recalcula sozinho (é derivado). O que precisa de cuidado é a
// sessão ficar MAIS CURTA que alguma aula: aulas ainda não geradas só têm a
// duração reduzida (nascem no tamanho novo); aulas já geradas e grandes demais
// voltam para `pending` e são refeitas na pré-geração.
import { badRequest, json, readJson, withAuth, zodMessage } from '@/lib/http'
import { availabilityInput, todayFor } from '@/lib/requests'
import { completedLessons, latestAvailability, lessonsOfPaths, loadSubject } from '@/lib/domain'
import { lessonMaxMinutes } from '@/lib/schedule'
import { adminClient } from '@/lib/supabase'
import { subjectDetail } from '@/lib/views'

export const PUT = withAuth<{ id: string }>(async ({ supabase, userId, request, params }) => {
  const parsed = availabilityInput.safeParse(await readJson(request))
  if (!parsed.success) throw badRequest(zodMessage(parsed.error))
  const a = parsed.data
  const subject = await loadSubject(supabase, params.id)
  if (subject.status === 'generating') throw badRequest('Espere a trilha ficar pronta para mudar a disponibilidade.', 'invalid_state')
  const current = await latestAvailability(supabase, subject.id)
  const { today } = await todayFor(request, supabase, userId)

  // A data de início é mantida; só muda quando vem explícita.
  const startDate = a.startDate ?? current?.start_date ?? today
  const deadline = a.deadline === undefined ? current?.deadline ?? null : a.deadline
  if (deadline && deadline <= startDate) throw badRequest('O prazo precisa ser depois do início.')

  const { error } = await supabase.from('availabilities').insert({
    subject_id: subject.id,
    user_id: userId,
    days_of_week: a.daysOfWeek,
    daily_minutes: a.dailyMinutes,
    sessions_per_day: a.sessionsPerDay,
    start_date: startDate,
    deadline,
    reminder_time: a.reminderTime === undefined ? current?.reminder_time ?? null : a.reminderTime,
  })
  if (error) throw error

  if (subject.active_path_id) {
    const max = lessonMaxMinutes(a)
    const [lessons, completed] = await Promise.all([
      lessonsOfPaths(supabase, [subject.active_path_id]),
      completedLessons(supabase, [subject.id]),
    ])
    const done = completed.get(subject.id) ?? new Set<string>()
    const tooLong = (lessons.get(subject.active_path_id) ?? []).filter((l) => !done.has(l.id) && l.estimated_minutes > max)
    if (tooLong.length) {
      const admin = adminClient()
      const ready = tooLong.filter((l) => l.content_status === 'ready').map((l) => l.id)
      await admin.from('lessons').update({ estimated_minutes: max }).in('id', tooLong.map((l) => l.id))
      if (ready.length) {
        await admin.from('exercises').delete().in('lesson_id', ready)
        await admin.from('lessons').update({ content_status: 'pending', content: null, summary: null }).in('id', ready)
      }
    }
  }

  // Hoje é recalculado com a disponibilidade nova (só o que nem começou).
  await supabase.from('study_sessions').delete()
    .eq('subject_id', subject.id).eq('scheduled_date', today).eq('status', 'planned')

  return json(await subjectDetail(supabase, await loadSubject(supabase, subject.id), today))
})
