// POST /api/reports — "reportar erro" numa aula ou exercício.
import { z } from 'zod'
import { badRequest, json, readJson, withAuth, zodMessage } from '@/lib/http'
import { rateLimit } from '@/lib/limits'

const input = z.object({
  lessonId: z.string().uuid(),
  exerciseId: z.string().uuid().nullable().optional(),
  reason: z.enum(['wrong_fact', 'wrong_answer', 'confusing', 'other']),
  message: z.string().trim().max(1000).nullable().optional(),
})

export const POST = withAuth(async ({ supabase, userId, request }) => {
  rateLimit(`report:${userId}`, 10)
  const parsed = input.safeParse(await readJson(request))
  if (!parsed.success) throw badRequest(zodMessage(parsed.error))
  const { error } = await supabase.from('content_reports').insert({
    user_id: userId,
    lesson_id: parsed.data.lessonId,
    exercise_id: parsed.data.exerciseId ?? null,
    reason: parsed.data.reason,
    message: parsed.data.message || null,
  })
  if (error) throw error
  return json({ ok: true }, { status: 201 })
})
