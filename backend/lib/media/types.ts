// lib/media/types.ts — o formato comum dos conteúdos externos.
//
// Cada fonte (YouTube, Wikipédia, podcasts) devolve candidatos neste formato. A
// seleção da IA escolhe entre eles, e os escolhidos viram linhas em
// `media_items` (compartilhada) e `lesson_media` (por aula).

export type MediaProvider = 'youtube' | 'wikipedia' | 'itunes'
export type MediaKind = 'video' | 'image' | 'podcast' | 'article'
export type MediaRole = 'core' | 'inline' | 'extra'

export interface MediaCandidate {
  /** Linha em `media_items`, quando já foi gravado. */
  id?: string
  provider: MediaProvider
  kind: MediaKind
  externalId: string
  title: string
  author: string | null
  url: string
  mediaUrl: string | null
  thumbnailUrl: string | null
  durationSec: number | null
  width: number | null
  height: number | null
  language: string | null
  license: string | null
  attribution: string | null
  description: string | null
  publishedAt: string | null
  /** Só para a seleção: visualizações do vídeo, quando a fonte informa. */
  views?: number | null
}

/** O que a seleção decidiu para uma aula, pronto para gravar e para o prompt. */
export interface LessonMediaPlan {
  picks: {
    candidate: MediaCandidate
    role: MediaRole
    /** 'vid1', 'img1'… para os blocos da aula. Nulo nos extras. */
    ref: string | null
    caption: string | null
    reason: string | null
    language: string | null
    countsMinutes: number
  }[]
  /** Minutos da aula ocupados pelo vídeo principal. */
  coreMinutes: number
}

export const EMPTY_PLAN: LessonMediaPlan = { picks: [], coreMinutes: 0 }
