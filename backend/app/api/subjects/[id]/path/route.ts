// POST /api/subjects/:id/path — o que fazer com a trilha da prévia.
//   { action: 'approve' }                 começa a estudar
//   { action: 'adjust', request: '...' }  a IA refaz com o pedido
//   { action: 'retry' }                   a geração falhou: tenta de novo
import { z } from 'zod'
import { badRequest, json, readJson, withAuth, zodMessage } from '@/lib/http'
import { todayFor } from '@/lib/requests'
import { latestAvailability, loadSubject, toAvailability } from '@/lib/domain'
import { assertDailyQuota, rateLimit } from '@/lib/limits'
import { startPathGeneration } from '@/lib/paths'
import { inngest, EVENTS } from '@/lib/inngest/client'
import { adminClient } from '@/lib/supabase'
import { subjectDetail } from '@/lib/views'

const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.literal('adjust'), request: z.string().trim().min(3, 'Diga o que mudar.').max(600) }),
  z.object({ action: z.literal('retry') }),
])

export const POST = withAuth<{ id: string }>(async ({ supabase, userId, request, params }) => {
  const parsed = input.safeParse(await readJson(request))
  if (!parsed.success) throw badRequest(zodMessage(parsed.error))
  const body = parsed.data
  const subject = await loadSubject(supabase, params.id)
  const { today } = await todayFor(request, supabase, userId)

  if (body.action === 'approve') {
    if (subject.status !== 'review' || !subject.active_path_id) {
      throw badRequest('A trilha ainda não está pronta para começar.', 'invalid_state')
    }
    await adminClient().from('learning_paths').update({ approved_at: new Date().toISOString() }).eq('id', subject.active_path_id)
    const { error } = await supabase.from('subjects')
      .update({ status: 'active', failure_reason: null, updated_at: new Date().toISOString() })
      .eq('id', subject.id)
    if (error) throw error
    // Pré-gera as primeiras aulas. Se falhar, elas saem sob demanda.
    await inngest.send({ name: EVENTS.subjectActivated, data: { userId, subjectId: subject.id } }).catch((e) => {
      console.error('[path] pré-geração não enviada', e)
    })
    return json(await subjectDetail(supabase, await loadSubject(supabase, subject.id), today))
  }

  const canRegenerate = body.action === 'adjust' ? subject.status === 'review' : subject.status === 'failed'
  if (!canRegenerate) throw badRequest('Não dá para refazer a trilha agora.', 'invalid_state')
  rateLimit(`path:${userId}`, 4)
  await assertDailyQuota(userId, 'path')
  const availability = await latestAvailability(supabase, subject.id)
  if (!availability) throw badRequest('O tema está sem disponibilidade.', 'invalid_state')

  await startPathGeneration({
    userId,
    subjectId: subject.id,
    depth: subject.depth,
    availability: toAvailability(availability),
    adjustment: body.action === 'adjust' ? body.request : null,
  })
  return json(await subjectDetail(supabase, await loadSubject(supabase, subject.id), today))
})
