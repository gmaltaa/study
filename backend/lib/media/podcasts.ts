// lib/media/podcasts.ts — episódios de podcast pela busca pública da Apple
// (iTunes Search API). Cobre os podcasts públicos, não precisa de chave e
// devolve o endereço do áudio do próprio programa, que o app toca direto, com
// crédito e link para o programa.
import { clip, getJson } from '@/lib/media/http'
import type { MediaCandidate } from '@/lib/media/types'

interface EpisodeResult {
  trackId?: number
  trackName?: string
  collectionName?: string
  description?: string
  shortDescription?: string
  episodeUrl?: string
  trackTimeMillis?: number
  artworkUrl600?: string
  artworkUrl160?: string
  trackViewUrl?: string
  collectionViewUrl?: string
  releaseDate?: string
}

export async function searchPodcasts(query: string, limit: number): Promise<MediaCandidate[]> {
  const params = new URLSearchParams({
    term: query,
    media: 'podcast',
    entity: 'podcastEpisode',
    country: 'BR',
    limit: String(limit),
  })
  const data = await getJson<{ results?: EpisodeResult[] }>(`https://itunes.apple.com/search?${params}`)
  return (data.results ?? [])
    .filter((r) => r.trackId && r.trackName && r.episodeUrl?.startsWith('https://') && (r.trackViewUrl || r.collectionViewUrl))
    .map((r) => ({
      provider: 'itunes' as const,
      kind: 'podcast' as const,
      externalId: String(r.trackId),
      title: r.trackName!,
      author: r.collectionName ?? null,
      url: (r.trackViewUrl ?? r.collectionViewUrl)!,
      mediaUrl: r.episodeUrl!,
      thumbnailUrl: r.artworkUrl600 ?? r.artworkUrl160 ?? null,
      durationSec: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : null,
      width: null,
      height: null,
      language: null,
      license: null,
      attribution: r.collectionName ? `${r.collectionName} · podcast` : 'Podcast',
      description: clip(r.shortDescription || r.description, 400),
      publishedAt: r.releaseDate ?? null,
    }))
}
