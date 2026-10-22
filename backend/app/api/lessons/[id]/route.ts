// GET /api/lessons/:id — a aula com o conteúdo e os exercícios.
//
// Aula ainda sem conteúdo: pede a geração (uma vez só, ver lib/lessons.ts) e
// responde `status: 'generating'`. O app mostra "preparando sua aula" e consulta
// de novo até ficar pronta.
//
// `?sessionId=` marca a sessão como iniciada.
import { HttpError, json, notFound, withAuth } from '@/lib/http'
import { assertDailyQuota } from '@/lib/limits'
import { requestLessonContent } from '@/lib/lessons'
import type { Block, StoredOption } from '@/lib/ai/schemas'
import { lessonMedia } from '@/lib/media/view'

export const GET = withAuth<{ id: string }>(async ({ supabase, userId, request, params }) => {
  // `learning_paths` e `subjects` se ligam de dois jeitos: a trilha aponta para
  // o tema (subject_id) e o tema aponta para a trilha ativa (active_path_id).
  // O embed precisa dizer qual: aqui é o tema DONO da trilha.
  const { data, error } = await supabase
    .from('lessons')
    .select('id, position, title, estimated_minutes, content_status, content, summary, modules(title, position), learning_paths(subject_id, subjects!learning_paths_subject_id_fkey(id, title, icon, color, topic_profile))')
    .eq('id', params.id)
    .maybeSingle()
  if (error) throw error
  if (!data) throw notFound('Aula')
  const lesson = data as unknown as {
    id: string; position: number; title: string; estimated_minutes: number
    content_status: 'pending' | 'generating' | 'ready' | 'failed'
    content: Block[] | null; summary: string | null
    modules: { title: string; position: number }
    learning_paths: { subject_id: string; subjects: { id: string; title: string; icon: string; color: string; topic_profile: { disclaimer?: string | null } | null } }
  }

  const sessionId = new URL(request.url).searchParams.get('sessionId')
  if (sessionId) {
    await supabase.from('study_sessions')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', sessionId).eq('status', 'planned')
  }

  const subject = lesson.learning_paths.subjects
  const base = {
    id: lesson.id,
    position: lesson.position,
    title: lesson.title,
    minutes: lesson.estimated_minutes,
    module: { title: lesson.modules.title, position: lesson.modules.position },
    subject: { id: subject.id, title: subject.title, icon: subject.icon, color: subject.color },
    disclaimer: subject.topic_profile?.disclaimer ?? null,
  }

  if (lesson.content_status !== 'ready' || !lesson.content) {
    let status: 'generating' | 'quota' = 'generating'
    try {
      await assertDailyQuota(userId, 'lesson')
      await requestLessonContent(userId, lesson.id)
    } catch (e) {
      if (e instanceof HttpError && e.code === 'daily_quota') status = 'quota'
      else throw e
    }
    return json({ ...base, status, blocks: [], summary: null, media: [], exercises: [], completed: false })
  }

  const [{ data: exercises, error: e2 }, { data: progress }, media] = await Promise.all([
    supabase.from('exercises').select('id, position, kind, prompt, options, correct_option_id, concept').eq('lesson_id', lesson.id).order('position'),
    supabase.from('lesson_progress').select('status').eq('lesson_id', lesson.id).eq('user_id', userId).maybeSingle(),
    lessonMedia(supabase, lesson.id),
  ])
  if (e2) throw e2
  // Vídeo removido do YouTube depois da geração: o bloco dele sai do texto.
  const refs = new Set(media.map((m) => m.ref).filter(Boolean))
  const blocks = lesson.content.filter((b) => b.type !== 'media' || refs.has(b.ref))

  return json({
    ...base,
    status: 'ready' as const,
    blocks,
    summary: lesson.summary,
    media,
    exercises: ((exercises ?? []) as {
      id: string; position: number; kind: string; prompt: string; options: StoredOption[]; correct_option_id: string; concept: string | null
    }[]).map((e) => ({
      id: e.id, position: e.position, kind: e.kind, prompt: e.prompt, concept: e.concept,
      options: e.options, correctOptionId: e.correct_option_id,
    })),
    completed: (progress as { status?: string } | null)?.status === 'completed',
  })
})
