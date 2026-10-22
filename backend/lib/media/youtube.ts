// lib/media/youtube.ts — vídeos do YouTube pela API oficial (Data API v3).
//
// Cota: o projeto tem 10.000 unidades por dia (o Google aumenta de graça, por
// formulário). Uma busca custa 100 e o detalhe de até 50 vídeos custa 1. Antes
// de cada busca, `reserve_api_units` (no banco, atômico) confere se ainda cabe
// no teto do dia; se não couber, a aula sai sem vídeo, sem erro.
//
// Regras da API: os dados guardados precisam ser atualizados periodicamente. O
// job `refresh-media` (lib/inngest/functions.ts) reconfere os vídeos guardados
// e marca como indisponível o que saiu do ar.
import { adminClient } from '@/lib/supabase'
import { clip, getJson } from '@/lib/media/http'
import type { MediaCandidate } from '@/lib/media/types'

const API = 'https://www.googleapis.com/youtube/v3'
const SEARCH_UNITS = 100
const LIST_UNITS = 1

const apiKey = () => process.env.YOUTUBE_API_KEY ?? ''
const dailyLimit = () => Number(process.env.YOUTUBE_DAILY_UNITS) || 9000

export function youtubeConfigured(): boolean {
  return !!apiKey()
}

/** 'PT1H2M3S' → 3723. Formato inválido → null. */
export function parseIsoDuration(iso: string | null | undefined): number | null {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso ?? '')
  if (!m) return null
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0))
  return d * 86400 + h * 3600 + min * 60 + s
}

async function reserve(units: number): Promise<boolean> {
  const { data, error } = await adminClient().rpc('reserve_api_units', {
    p_provider: 'youtube', p_units: units, p_limit: dailyLimit(),
  })
  if (error) throw error
  return data === true
}

interface VideoResource {
  id: string
  snippet?: {
    title?: string
    description?: string
    channelTitle?: string
    publishedAt?: string
    defaultAudioLanguage?: string
    defaultLanguage?: string
    thumbnails?: Record<string, { url: string; width?: number; height?: number }>
  }
  contentDetails?: { duration?: string; contentRating?: { ytRating?: string } }
  statistics?: { viewCount?: string }
  status?: { embeddable?: boolean; privacyStatus?: string }
}

function toCandidate(v: VideoResource): MediaCandidate | null {
  const s = v.snippet
  if (!s?.title) return null
  if (v.status && (v.status.embeddable === false || v.status.privacyStatus !== 'public')) return null
  if (v.contentDetails?.contentRating?.ytRating === 'ytAgeRestricted') return null
  const duration = parseIsoDuration(v.contentDetails?.duration)
  if (!duration) return null
  const thumb = s.thumbnails?.high ?? s.thumbnails?.medium ?? s.thumbnails?.default
  return {
    provider: 'youtube',
    kind: 'video',
    externalId: v.id,
    title: s.title,
    author: s.channelTitle ?? null,
    url: `https://www.youtube.com/watch?v=${v.id}`,
    mediaUrl: v.id,
    thumbnailUrl: thumb?.url ?? null,
    durationSec: duration,
    width: null,
    height: null,
    language: (s.defaultAudioLanguage ?? s.defaultLanguage ?? '').slice(0, 2) || null,
    license: null,
    attribution: s.channelTitle ? `${s.channelTitle} · YouTube` : 'YouTube',
    description: clip(s.description, 400),
    publishedAt: s.publishedAt ?? null,
    views: v.statistics?.viewCount ? Number(v.statistics.viewCount) : null,
  }
}

async function listVideos(ids: string[]): Promise<VideoResource[]> {
  if (ids.length === 0) return []
  const params = new URLSearchParams({
    part: 'snippet,contentDetails,statistics,status',
    id: ids.join(','),
    maxResults: String(ids.length),
    key: apiKey(),
  })
  const data = await getJson<{ items?: VideoResource[] }>(`${API}/videos?${params}`)
  return data.items ?? []
}

/**
 * Busca vídeos em português, do Brasil, incorporáveis e com busca segura.
 * Devolve [] quando não há chave ou a cota do dia acabou.
 */
export async function searchYouTube(query: string, maxDurationMin: number): Promise<MediaCandidate[]> {
  if (!youtubeConfigured()) return []
  if (!(await reserve(SEARCH_UNITS + LIST_UNITS))) {
    console.warn('[youtube] cota do dia esgotada, aula sem vídeo')
    return []
  }
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '10',
    q: query,
    relevanceLanguage: 'pt',
    regionCode: 'BR',
    safeSearch: 'strict',
    videoEmbeddable: 'true',
    // short = menos de 4 min; medium = de 4 a 20 min.
    videoDuration: maxDurationMin < 4 ? 'short' : 'medium',
    key: apiKey(),
  })
  const data = await getJson<{ items?: { id?: { videoId?: string } }[] }>(`${API}/search?${params}`)
  const ids = (data.items ?? []).map((i) => i.id?.videoId).filter((x): x is string => !!x)
  return (await listVideos(ids)).map(toCandidate).filter((c): c is MediaCandidate => c !== null)
}

/** Reconfere vídeos guardados. Devolve os candidatos atualizados e os ids que saíram do ar. */
export async function refreshVideos(ids: string[]): Promise<{ updated: MediaCandidate[]; gone: string[] }> {
  const updated: MediaCandidate[] = []
  const gone: string[] = []
  if (!youtubeConfigured()) return { updated, gone }
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50)
    // Sem cota, para aqui: o que não foi conferido fica como está.
    if (!(await reserve(LIST_UNITS))) break
    const byId = new Map((await listVideos(batch)).map((v) => [v.id, toCandidate(v)]))
    for (const id of batch) {
      const c = byId.get(id)
      // Não voltou (removido) ou voltou privado / não incorporável: saiu do ar.
      if (c) updated.push(c)
      else gone.push(id)
    }
  }
  return { updated, gone }
}
