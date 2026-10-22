// /api/subjects — GET lista os temas; POST cria um tema e pede a trilha.
//
// Criar é síncrono só até o perfil do tema (passo 1, ~2 s): é ele que recusa na
// hora um tema que não pode ser ensinado. A trilha é gerada em segundo plano
// (Inngest) e o app acompanha pelo GET /api/subjects/:id.
import { z } from 'zod'
import { HttpError, badRequest, json, readJson, withAuth, zodMessage } from '@/lib/http'
import { availabilityInput, todayFor } from '@/lib/requests'
import { addDays } from '@/lib/dates'
import { countStudyDays } from '@/lib/schedule'
import { assertDailyQuota, LIMITS, rateLimit } from '@/lib/limits'
import { profileTopic } from '@/lib/ai/generate'
import { startPathGeneration } from '@/lib/paths'
import { SUBJECT_COLUMNS, type SubjectRow } from '@/lib/domain'
import { subjectSummaries } from '@/lib/views'

export const maxDuration = 30

export const GET = withAuth(async ({ supabase, userId, request }) => {
  const { today } = await todayFor(request, supabase, userId)
  const { data, error } = await supabase
    .from('subjects')
    .select(SUBJECT_COLUMNS)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return json({ subjects: await subjectSummaries(supabase, (data ?? []) as SubjectRow[], today) })
})

const createInput = z.object({
  title: z.string().trim().min(2, 'Escreva o tema com pelo menos 2 letras.').max(120),
  goal: z.string().trim().max(600).nullable().optional(),
  level: z.enum(['beginner', 'some_knowledge', 'intermediate']),
  depth: z.enum(['intro', 'solid', 'deep']),
  style: z.enum(['theory', 'balanced', 'practice']).default('balanced'),
  availability: availabilityInput,
})

export const POST = withAuth(async ({ supabase, userId, request }) => {
  rateLimit(`subject-create:${userId}`, 5)
  const parsed = createInput.safeParse(await readJson(request))
  if (!parsed.success) throw badRequest(zodMessage(parsed.error))
  const input = parsed.data

  const { count, error: countError } = await supabase
    .from('subjects')
    .select('id', { count: 'exact', head: true })
    .is('archived_at', null)
    .neq('status', 'completed')
  if (countError) throw countError
  if ((count ?? 0) >= LIMITS.activeSubjects) {
    throw new HttpError(403, 'subject_limit', `Você pode ter até ${LIMITS.activeSubjects} temas ativos. Arquive ou conclua um para criar outro.`)
  }
  await assertDailyQuota(userId, 'path')

  const { today } = await todayFor(request, supabase, userId)
  const availability = {
    daysOfWeek: input.availability.daysOfWeek,
    dailyMinutes: input.availability.dailyMinutes,
    sessionsPerDay: input.availability.sessionsPerDay,
    startDate: input.availability.startDate ?? today,
    deadline: input.availability.deadline ?? null,
  }
  if (availability.startDate < today) throw badRequest('A data de início não pode ser no passado.')
  if (availability.startDate > addDays(today, 60)) throw badRequest('Comece em até 60 dias.')
  if (availability.deadline) {
    if (availability.deadline <= availability.startDate) throw badRequest('O prazo precisa ser depois do início.')
    if (countStudyDays(availability.daysOfWeek, availability.startDate, availability.deadline) === 0) {
      throw badRequest('Não há nenhum dia de estudo até o prazo. Escolha outros dias ou outro prazo.')
    }
  }

  let profile
  try {
    profile = await profileTopic(userId, input.title, input.goal ?? null)
  } catch (e) {
    console.error('[subjects] perfil do tema falhou', e)
    throw new HttpError(502, 'ai_unavailable', 'Não conseguimos falar com a IA agora. Tente de novo em instantes.')
  }
  if (!profile.allowed) {
    throw new HttpError(422, 'topic_not_allowed', profile.refusal_reason || 'Esse tema não pode ser ensinado aqui.')
  }

  const { data: subject, error } = await supabase
    .from('subjects')
    .insert({
      user_id: userId,
      title: profile.normalized_title.trim().slice(0, 120) || input.title,
      goal: input.goal || null,
      level: input.level,
      depth: input.depth,
      preferences: { style: input.style },
      icon: [...(profile.icon || '📘')].slice(0, 2).join(''),
      topic_profile: profile,
      status: 'generating',
    })
    .select('id')
    .single()
  if (error) throw error

  const { error: e2 } = await supabase.from('availabilities').insert({
    subject_id: subject.id,
    user_id: userId,
    days_of_week: availability.daysOfWeek,
    daily_minutes: availability.dailyMinutes,
    sessions_per_day: availability.sessionsPerDay,
    start_date: availability.startDate,
    deadline: availability.deadline,
    reminder_time: input.availability.reminderTime ?? null,
  })
  if (e2) throw e2

  // Se o envio ao Inngest falhar, o tema já existe e fica `failed`, com "tentar
  // de novo" na tela dele. Por isso o id volta mesmo assim.
  try {
    await startPathGeneration({ userId, subjectId: subject.id, depth: input.depth, availability })
  } catch (e) {
    if (!(e instanceof HttpError)) throw e
  }
  return json({ id: subject.id }, { status: 201 })
})
