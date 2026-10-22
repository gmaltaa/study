// lib/media/view.ts — o formato do conteúdo externo que a API entrega ao app.
import type { SupabaseClient } from '@supabase/supabase-js'
import { ITEM_COLUMNS, type MediaItemRow } from '@/lib/media/resolve'
import type { MediaRole } from '@/lib/media/types'

export const LESSON_MEDIA_COLUMNS = `id, lesson_id, role, position, ref, caption, reason, counts_minutes, feedback, media_items(${ITEM_COLUMNS}, status)`

export interface LessonMediaRow {
  id: string
  lesson_id: string
  role: MediaRole
  position: number
  ref: string | null
  caption: string | null
  reason: string | null
  counts_minutes: number
  feedback: 'helpful' | 'not_helpful' | null
  media_items: (MediaItemRow & { status: string }) | null
}

export function toMediaView(r: LessonMediaRow) {
  const m = r.media_items!
  return {
    id: r.id,
    ref: r.ref,
    role: r.role,
    kind: m.kind,
    provider: m.provider,
    title: m.title,
    author: m.author,
    url: m.url,
    mediaUrl: m.media_url,
    thumbnailUrl: m.thumbnail_url,
    durationSec: m.duration_sec,
    width: m.width,
    height: m.height,
    language: m.language,
    license: m.license,
    attribution: m.attribution,
    description: m.description,
    caption: r.caption,
    reason: r.reason,
    countsMinutes: r.counts_minutes,
    feedback: r.feedback,
  }
}

export type MediaView = ReturnType<typeof toMediaView>

/** Só o que continua no ar: vídeo removido do YouTube some da aula. */
export function visible(rows: LessonMediaRow[]): LessonMediaRow[] {
  return rows.filter((r) => r.media_items && r.media_items.status === 'active')
}

/** Mídia de uma aula. Sem as tabelas (migration 002 não rodada), devolve vazio. */
export async function lessonMedia(db: SupabaseClient, lessonId: string): Promise<MediaView[]> {
  const { data, error } = await db
    .from('lesson_media')
    .select(LESSON_MEDIA_COLUMNS)
    .eq('lesson_id', lessonId)
    .order('position')
  if (error) {
    console.error('[media] leitura da mídia da aula falhou', error.message)
    return []
  }
  return visible((data ?? []) as unknown as LessonMediaRow[]).map(toMediaView)
}
