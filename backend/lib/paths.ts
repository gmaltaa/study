// lib/paths.ts — começar a geração de uma trilha (criar tema, ajustar, tentar de novo).
import { adminClient } from '@/lib/supabase'
import { HttpError } from '@/lib/http'
import { inngest, EVENTS } from '@/lib/inngest/client'
import { lessonMaxMinutes, pathBudget, type Availability, type Depth } from '@/lib/schedule'

/**
 * Cria a próxima versão da trilha do tema e manda gerar. O tema fica
 * `generating` apontando para ela; quando a geração termina, vira `review`.
 */
export async function startPathGeneration(p: {
  userId: string
  subjectId: string
  depth: Depth
  availability: Availability
  adjustment?: string | null
}): Promise<string> {
  const db = adminClient()
  const { data: last } = await db
    .from('learning_paths')
    .select('version')
    .eq('subject_id', p.subjectId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: path, error } = await db
    .from('learning_paths')
    .insert({
      subject_id: p.subjectId,
      user_id: p.userId,
      version: ((last?.version as number | undefined) ?? 0) + 1,
      budget_minutes: pathBudget(p.availability, p.depth),
      lesson_max_minutes: lessonMaxMinutes(p.availability),
      adjustment_request: p.adjustment ?? null,
    })
    .select('id')
    .single()
  if (error) throw error

  await db.from('subjects').update({
    status: 'generating', active_path_id: path.id, failure_reason: null, updated_at: new Date().toISOString(),
  }).eq('id', p.subjectId)

  try {
    await inngest.send({ name: EVENTS.generatePath, data: { userId: p.userId, subjectId: p.subjectId, pathId: path.id } })
  } catch (e) {
    console.error('[paths] envio ao Inngest falhou', e)
    await db.from('learning_paths').update({ status: 'failed', failure_reason: 'inngest_send' }).eq('id', path.id)
    await db.from('subjects').update({
      status: 'failed', failure_reason: 'Não conseguimos começar a montar a trilha. Tente de novo.',
    }).eq('id', p.subjectId)
    throw new HttpError(502, 'generation_unavailable', 'Não conseguimos começar a montar a trilha. Tente de novo em instantes.')
  }
  return path.id as string
}
