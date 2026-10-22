// POST /api/exercises/:id/answer — registra a resposta de um exercício.
//
// O app já tem o gabarito e mostra a explicação na hora; esta rota só grava a
// tentativa (o acerto é conferido aqui, não confiado ao app) para o progresso.
import { z } from 'zod'
import { badRequest, json, notFound, readJson, withAuth, zodMessage } from '@/lib/http'
import { rateLimit } from '@/lib/limits'

const input = z.object({
  optionId: z.string().min(1).max(4),
  sessionId: z.string().uuid().nullable().optional(),
})

export const POST = withAuth<{ id: string }>(async ({ supabase, userId, request, params }) => {
  rateLimit(`answer:${userId}`, 60)
  const parsed = input.safeParse(await readJson(request))
  if (!parsed.success) throw badRequest(zodMessage(parsed.error))

  const { data: exercise, error } = await supabase
    .from('exercises').select('id, options, correct_option_id').eq('id', params.id).maybeSingle()
  if (error) throw error
  if (!exercise) throw notFound('Exercício')
  const options = exercise.options as { id: string }[]
  if (!options.some((o) => o.id === parsed.data.optionId)) throw badRequest('Alternativa inválida.')

  const correct = parsed.data.optionId === exercise.correct_option_id
  const { error: e2 } = await supabase.from('exercise_attempts').insert({
    user_id: userId,
    exercise_id: exercise.id,
    session_id: parsed.data.sessionId ?? null,
    chosen_option_id: parsed.data.optionId,
    is_correct: correct,
  })
  if (e2) throw e2
  return json({ correct, correctOptionId: exercise.correct_option_id })
})
