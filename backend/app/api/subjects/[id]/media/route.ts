// GET /api/subjects/:id/media — a biblioteca do tema: todo o conteúdo externo
// (vídeos, podcasts, imagens, leituras) das aulas já preparadas, por módulo.
// As aulas futuras entram na biblioteca conforme são geradas.
import { json, withAuth } from '@/lib/http'
import { loadSubject } from '@/lib/domain'
import { LESSON_MEDIA_COLUMNS, toMediaView, visible, type LessonMediaRow } from '@/lib/media/view'

export const GET = withAuth<{ id: string }>(async ({ supabase, params }) => {
  const subject = await loadSubject(supabase, params.id)
  if (!subject.active_path_id) return json({ modules: [] })

  const [{ data: modules, error }, { data: rows, error: e2 }] = await Promise.all([
    supabase.from('modules').select('id, position, title').eq('path_id', subject.active_path_id).order('position'),
    supabase
      .from('lesson_media')
      .select(`${LESSON_MEDIA_COLUMNS}, lessons!inner(id, title, position, module_id, path_id)`)
      .eq('lessons.path_id', subject.active_path_id),
  ])
  if (error) throw error
  if (e2) {
    console.error('[media] biblioteca indisponível', e2.message)
    return json({ modules: [] })
  }

  type Row = LessonMediaRow & { lessons: { id: string; title: string; position: number; module_id: string } }
  const items = visible((rows ?? []) as unknown as Row[]) as Row[]
  items.sort((a, b) => a.lessons.position - b.lessons.position || a.position - b.position)

  return json({
    modules: ((modules ?? []) as { id: string; position: number; title: string }[])
      .map((m) => ({
        id: m.id,
        position: m.position,
        title: m.title,
        items: items
          .filter((r) => r.lessons.module_id === m.id)
          .map((r) => ({ ...toMediaView(r), lesson: { id: r.lessons.id, title: r.lessons.title, position: r.lessons.position } })),
      }))
      .filter((m) => m.items.length > 0),
  })
})
