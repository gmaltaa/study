// lib/lessons.ts — pedir o conteúdo de uma aula e montar o contexto da geração.
import type { SupabaseClient } from '@supabase/supabase-js'
import { adminClient } from '@/lib/supabase'
import { inngest, EVENTS } from '@/lib/inngest/client'
import { learnerInput, SUBJECT_COLUMNS, type SubjectRow } from '@/lib/domain'
import type { LessonInput } from '@/lib/ai/generate'

/** Depois disso, uma geração "em andamento" é considerada perdida e pode ser
 *  pedida de novo (a função do Inngest morreu sem marcar falha). */
const STALE_MS = 5 * 60 * 1000

/**
 * Pede a geração do conteúdo, uma vez só. O UPDATE condicional é a trava:
 * de dois pedidos ao mesmo tempo, só um muda a linha e manda o evento.
 *
 * Devolve true quando o pedido saiu agora.
 */
export async function requestLessonContent(userId: string, lessonId: string): Promise<boolean> {
  const db = adminClient()
  const staleBefore = new Date(Date.now() - STALE_MS).toISOString()
  const { data, error } = await db
    .from('lessons')
    .update({ content_status: 'generating', generation_requested_at: new Date().toISOString() })
    .eq('id', lessonId)
    .eq('user_id', userId)
    .or(`content_status.in.(pending,failed),and(content_status.eq.generating,generation_requested_at.lt.${staleBefore})`)
    .select('id')
  if (error) throw error
  if (!data?.length) return false
  try {
    await inngest.send({ name: EVENTS.generateLesson, data: { userId, lessonId } })
  } catch (e) {
    await db.from('lessons').update({ content_status: 'failed' }).eq('id', lessonId)
    throw e
  }
  return true
}

/** Tudo que a geração de uma aula precisa saber, lido com o cliente admin. */
export async function loadLessonInput(db: SupabaseClient, lessonId: string): Promise<{
  input: LessonInput
  subject: SubjectRow
  contentStatus: string
} | null> {
  const { data: lesson, error } = await db
    .from('lessons')
    .select('id, path_id, module_id, position, title, objectives, key_concepts, estimated_minutes, content_status, modules(title, objective), learning_paths(subject_id)')
    .eq('id', lessonId)
    .maybeSingle()
  if (error) throw error
  if (!lesson) return null
  const l = lesson as unknown as {
    id: string; path_id: string; position: number; title: string; objectives: string[]; key_concepts: string[]
    estimated_minutes: number; content_status: string
    modules: { title: string; objective: string }
    learning_paths: { subject_id: string }
  }
  const [{ data: subject, error: e1 }, { data: modules, error: e2 }] = await Promise.all([
    db.from('subjects').select(SUBJECT_COLUMNS).eq('id', l.learning_paths.subject_id).single(),
    db.from('modules').select('id, position, title, lessons(position, title)').eq('path_id', l.path_id).order('position'),
  ])
  if (e1) throw e1
  if (e2) throw e2
  const s = subject as SubjectRow
  const outline = {
    modules: ((modules ?? []) as { title: string; lessons: { position: number; title: string }[] }[]).map((m) => ({
      title: m.title,
      lessons: [...(m.lessons ?? [])].sort((a, b) => a.position - b.position),
    })),
  }
  return {
    subject: s,
    contentStatus: l.content_status,
    input: {
      ...learnerInput(s),
      outline,
      lesson: {
        id: l.id,
        position: l.position,
        title: l.title,
        objectives: l.objectives,
        key_concepts: l.key_concepts,
        minutes: l.estimated_minutes,
        moduleTitle: l.modules.title,
        moduleObjective: l.modules.objective,
      },
    },
  }
}
