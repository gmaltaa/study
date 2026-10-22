// lib/media/resolve.ts — encontra e escolhe o conteúdo externo de uma aula.
//
// 1. Busca nas fontes, em paralelo, com termos tirados da própria aula (título,
//    conceitos-chave e o tema). Sem IA nesta parte.
// 2. Cada busca passa pelo cache compartilhado (`media_searches`): quem estuda
//    o mesmo assunto depois reaproveita o resultado. É o que faz a cota do
//    YouTube render.
// 3. A IA rápida escolhe entre os resultados (lib/ai/generate.ts →
//    selectLessonMedia) e o código confere a escolha (lib/media/select.ts).
//
// Nada aqui derruba a geração da aula: fonte fora do ar ou cota esgotada só
// deixam a aula com menos mídia.
import { adminClient } from '@/lib/supabase'
import { selectLessonMedia, type LessonInput } from '@/lib/ai/generate'
import { searchWikipedia } from '@/lib/media/wikipedia'
import { searchYouTube, youtubeConfigured } from '@/lib/media/youtube'
import { searchPodcasts } from '@/lib/media/podcasts'
import { EMPTY_PLAN, type LessonMediaPlan, type MediaCandidate, type MediaProvider } from '@/lib/media/types'

/** Parte da aula que o vídeo principal pode ocupar. O resto é texto e exercícios. */
const CORE_VIDEO_SHARE = 0.5
/** Vídeo principal com menos que isso não compensa: aula curta fica sem vídeo. */
const MIN_CORE_SEC = 2 * 60

const DAY_MS = 24 * 60 * 60 * 1000
const TTL: Record<MediaProvider, number> = {
  // As regras da API do YouTube pedem dados atualizados: busca vale 7 dias.
  youtube: 7 * DAY_MS,
  wikipedia: 30 * DAY_MS,
  itunes: 7 * DAY_MS,
}

export const ITEM_COLUMNS =
  'id, provider, kind, external_id, title, author, url, media_url, thumbnail_url, duration_sec, width, height, language, license, attribution, description, published_at'

export interface MediaItemRow {
  id: string
  provider: MediaProvider
  kind: MediaCandidate['kind']
  external_id: string
  title: string
  author: string | null
  url: string
  media_url: string | null
  thumbnail_url: string | null
  duration_sec: number | null
  width: number | null
  height: number | null
  language: string | null
  license: string | null
  attribution: string | null
  description: string | null
  published_at: string | null
}

export function rowToCandidate(r: MediaItemRow): MediaCandidate {
  return {
    id: r.id, provider: r.provider, kind: r.kind, externalId: r.external_id, title: r.title, author: r.author,
    url: r.url, mediaUrl: r.media_url, thumbnailUrl: r.thumbnail_url, durationSec: r.duration_sec,
    width: r.width, height: r.height, language: r.language, license: r.license, attribution: r.attribution,
    description: r.description, publishedAt: r.published_at,
  }
}

export function candidateToRow(c: MediaCandidate) {
  return {
    provider: c.provider, kind: c.kind, external_id: c.externalId, title: c.title.slice(0, 300), author: c.author,
    url: c.url, media_url: c.mediaUrl, thumbnail_url: c.thumbnailUrl, duration_sec: c.durationSec,
    width: c.width, height: c.height, language: c.language, license: c.license, attribution: c.attribution,
    description: c.description, published_at: c.publishedAt, status: 'active', checked_at: new Date().toISOString(),
  }
}

/** Grava (ou atualiza) os candidatos em `media_items` e devolve com o id. */
async function upsertItems(found: MediaCandidate[]): Promise<MediaCandidate[]> {
  if (found.length === 0) return []
  const { data, error } = await adminClient()
    .from('media_items')
    .upsert(found.map(candidateToRow), { onConflict: 'provider,external_id' })
    .select(ITEM_COLUMNS)
  if (error) throw error
  const views = new Map(found.map((c) => [`${c.provider}:${c.externalId}`, c.views ?? null]))
  const byKey = new Map(((data ?? []) as MediaItemRow[]).map((r) => [`${r.provider}:${r.external_id}`, r]))
  // Mantém a ordem da fonte (relevância), que o upsert não garante.
  return found
    .map((c) => byKey.get(`${c.provider}:${c.externalId}`))
    .filter((r): r is MediaItemRow => !!r)
    .map((r) => ({ ...rowToCandidate(r), views: views.get(`${r.provider}:${r.external_id}`) }))
}

async function cachedSearch(provider: MediaProvider, query: string, fetcher: () => Promise<MediaCandidate[]>): Promise<MediaCandidate[]> {
  const db = adminClient()
  const key = query.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim()
  const since = new Date(Date.now() - TTL[provider]).toISOString()
  const { data: hit } = await db
    .from('media_searches')
    .select('item_ids')
    .eq('provider', provider)
    .eq('query_key', key)
    .gte('fetched_at', since)
    .maybeSingle()
  if (hit) {
    const ids = (hit.item_ids ?? []) as string[]
    if (ids.length === 0) return []
    const { data } = await db.from('media_items').select(ITEM_COLUMNS).in('id', ids).eq('status', 'active')
    const byId = new Map(((data ?? []) as MediaItemRow[]).map((r) => [r.id, r]))
    return ids.map((id) => byId.get(id)).filter((r): r is MediaItemRow => !!r).map(rowToCandidate)
  }
  const items = await upsertItems(await fetcher())
  await db.from('media_searches').upsert({
    provider, query_key: key, item_ids: items.map((c) => c.id!), fetched_at: new Date().toISOString(),
  })
  return items
}

export async function planLessonMedia(
  meta: { userId: string; subjectId: string; lessonId: string },
  input: LessonInput,
  subjectTitle: string,
): Promise<LessonMediaPlan> {
  const { lesson } = input
  const maxCoreSec = Math.floor(lesson.minutes * CORE_VIDEO_SHARE) * 60
  const searches: { name: string; run: Promise<MediaCandidate[]> }[] = []

  if (youtubeConfigured() && maxCoreSec >= MIN_CORE_SEC) {
    const q = `${lesson.title} ${subjectTitle}`
    const bucket = maxCoreSec < 4 * 60 ? 'short' : 'medium'
    searches.push({ name: 'youtube', run: cachedSearch('youtube', `${q}|${bucket}`, () => searchYouTube(q, maxCoreSec / 60)) })
  }
  for (const q of [lesson.title, lesson.key_concepts[0]].filter((x): x is string => !!x)) {
    searches.push({ name: `wikipedia:${q}`, run: cachedSearch('wikipedia', q, () => searchWikipedia(q, 4)) })
  }
  searches.push({ name: 'podcasts', run: cachedSearch('itunes', lesson.title, () => searchPodcasts(lesson.title, 6)) })

  const settled = await Promise.allSettled(searches.map((s) => s.run))
  const seen = new Set<string>()
  const candidates: MediaCandidate[] = []
  settled.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[media] busca ${searches[i].name} falhou`, r.reason)
      return
    }
    for (const c of r.value) {
      const key = `${c.provider}:${c.externalId}`
      if (!seen.has(key)) {
        seen.add(key)
        candidates.push(c)
      }
    }
  })
  if (candidates.length === 0) return EMPTY_PLAN

  return selectLessonMedia(meta, {
    subjectTitle,
    moduleTitle: lesson.moduleTitle,
    lessonTitle: lesson.title,
    objectives: lesson.objectives,
    keyConcepts: lesson.key_concepts,
    lessonMinutes: lesson.minutes,
    maxCoreSec,
  }, candidates)
}
