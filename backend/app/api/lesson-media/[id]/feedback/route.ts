// POST /api/lesson-media/:id/feedback — "esse conteúdo ajudou?".
// Fica gravado para avaliar as fontes e melhorar a seleção.
import { z } from 'zod'
import { badRequest, json, notFound, readJson, withAuth, zodMessage } from '@/lib/http'
import { rateLimit } from '@/lib/limits'

const input = z.object({ helpful: z.boolean() })

export const POST = withAuth<{ id: string }>(async ({ supabase, userId, request, params }) => {
  rateLimit(`media-feedback:${userId}`, 30)
  const parsed = input.safeParse(await readJson(request))
  if (!parsed.success) throw badRequest(zodMessage(parsed.error))
  const { data, error } = await supabase
    .from('lesson_media')
    .update({ feedback: parsed.data.helpful ? 'helpful' : 'not_helpful', feedback_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('id')
  if (error) throw error
  if (!data?.length) throw notFound('Conteúdo')
  return json({ ok: true })
})
