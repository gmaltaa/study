// /api/subjects/:id — GET detalhe (trilha, cronograma, progresso), PATCH pausa,
// retoma, arquiva ou renomeia, DELETE exclui o tema e tudo dele.
import { z } from 'zod'
import { badRequest, json, readJson, withAuth, zodMessage } from '@/lib/http'
import { todayFor } from '@/lib/requests'
import { loadSubject } from '@/lib/domain'
import { subjectDetail } from '@/lib/views'

export const GET = withAuth<{ id: string }>(async ({ supabase, userId, request, params }) => {
  const subject = await loadSubject(supabase, params.id)
  const { today } = await todayFor(request, supabase, userId)
  return json(await subjectDetail(supabase, subject, today))
})

const patchInput = z.object({
  status: z.enum(['active', 'paused']).optional(),
  archived: z.boolean().optional(),
  title: z.string().trim().min(2).max(120).optional(),
  icon: z.string().min(1).max(8).optional(),
})

export const PATCH = withAuth<{ id: string }>(async ({ supabase, userId, request, params }) => {
  const parsed = patchInput.safeParse(await readJson(request))
  if (!parsed.success) throw badRequest(zodMessage(parsed.error))
  const subject = await loadSubject(supabase, params.id)
  const { status, archived, title, icon } = parsed.data

  if (status) {
    const allowed = (status === 'paused' && subject.status === 'active') || (status === 'active' && subject.status === 'paused')
    if (!allowed) throw badRequest('Esse tema não pode mudar para esse estado agora.', 'invalid_state')
  }
  const { today } = await todayFor(request, supabase, userId)
  if (status === 'paused' || archived) {
    // As sessões de hoje que nem começaram saem; ao retomar, o dia é recalculado.
    await supabase.from('study_sessions').delete()
      .eq('subject_id', subject.id).eq('scheduled_date', today).eq('status', 'planned')
  }

  const { error } = await supabase.from('subjects').update({
    ...(status && { status }),
    ...(archived !== undefined && { archived_at: archived ? new Date().toISOString() : null }),
    ...(title && { title }),
    ...(icon && { icon }),
    updated_at: new Date().toISOString(),
  }).eq('id', subject.id)
  if (error) throw error
  return json(await subjectDetail(supabase, await loadSubject(supabase, subject.id), today))
})

export const DELETE = withAuth<{ id: string }>(async ({ supabase, params }) => {
  const subject = await loadSubject(supabase, params.id)
  const { error } = await supabase.from('subjects').delete().eq('id', subject.id)
  if (error) throw error
  return json({ ok: true })
})
