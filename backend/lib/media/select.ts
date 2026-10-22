// lib/media/select.ts — o que o código garante sobre a escolha da IA.
//
// A IA escolhe entre os resultados de busca usando ids curtos (v1, i1, a1,
// p1). Aqui cada escolha é conferida contra os candidatos reais: o id existe,
// o tipo bate, o vídeo principal está em português e cabe no tempo, nada se
// repete. O que não passa é descartado em silêncio: a aula sai com menos
// mídia, nunca com mídia errada.
import type { MediaSelection } from '@/lib/ai/schemas'
import type { MediaPromptCandidate } from '@/lib/ai/prompts'
import { clip } from '@/lib/media/http'
import type { LessonMediaPlan, MediaCandidate } from '@/lib/media/types'

const PREFIX = { video: 'v', image: 'i', article: 'a', podcast: 'p' } as const

/** Os candidatos com o id curto que a IA vê. */
export function labelCandidates(candidates: MediaCandidate[]): Map<string, MediaCandidate> {
  const out = new Map<string, MediaCandidate>()
  const count = { video: 0, image: 0, article: 0, podcast: 0 }
  for (const c of candidates) out.set(`${PREFIX[c.kind]}${++count[c.kind]}`, c)
  return out
}

export function toPromptCandidates(labeled: Map<string, MediaCandidate>): MediaPromptCandidate[] {
  return [...labeled].map(([id, c]) => ({
    id,
    kind: c.kind,
    title: c.title,
    author: c.author,
    minutes: c.durationSec != null ? Math.max(1, Math.round(c.durationSec / 60)) : null,
    views: c.views ?? null,
    year: c.publishedAt ? c.publishedAt.slice(0, 4) : null,
    description: c.description,
  }))
}

const MAX_IMAGES = 2
const MAX_EXTRAS = 2
/** Extra longo demais vira tarefa, não complemento. */
const MAX_EXTRA_SEC = 90 * 60

const isPortuguese = (lang: string | null | undefined) => !!lang && lang.toLowerCase().startsWith('pt')
const isAccepted = (lang: string | null | undefined) => isPortuguese(lang) || (!!lang && lang.toLowerCase().startsWith('en'))

export function validateSelection(
  raw: MediaSelection,
  labeled: Map<string, MediaCandidate>,
  maxCoreSec: number,
): LessonMediaPlan {
  const used = new Set<string>()
  const keyOf = (c: MediaCandidate) => `${c.provider}:${c.externalId}`
  // Só marca como usado o que foi ACEITO: um vídeo recusado como principal
  // (longo demais) ainda pode entrar como extra.
  const find = (id: string | undefined, kinds: MediaCandidate['kind'][]) => {
    const c = id ? labeled.get(id.trim()) : undefined
    return c && kinds.includes(c.kind) && !used.has(keyOf(c)) ? c : null
  }
  const accept = (c: MediaCandidate) => used.add(keyOf(c))
  const plan: LessonMediaPlan = { picks: [], coreMinutes: 0 }

  if (raw.core_video) {
    const c = find(raw.core_video.id, ['video'])
    const language = c?.language ?? raw.core_video.language
    if (c && c.durationSec && c.durationSec <= maxCoreSec && isPortuguese(language)) {
      accept(c)
      const minutes = Math.ceil(c.durationSec / 60)
      plan.coreMinutes = minutes
      plan.picks.push({
        candidate: c, role: 'core', ref: 'vid1', caption: null,
        reason: clip(raw.core_video.reason, 200), language: 'pt', countsMinutes: minutes,
      })
    }
  }

  let img = 0
  for (const pick of raw.images) {
    if (img >= MAX_IMAGES) break
    const c = find(pick.id, ['image'])
    if (!c) continue
    accept(c)
    plan.picks.push({
      candidate: c, role: 'inline', ref: `img${++img}`, caption: clip(pick.caption, 160),
      reason: clip(pick.reason, 200), language: null, countsMinutes: 0,
    })
  }

  if (raw.reading) {
    const c = find(raw.reading.id, ['article'])
    if (c) {
      accept(c)
      plan.picks.push({
        candidate: c, role: 'extra', ref: null, caption: null,
        reason: clip(raw.reading.reason, 200), language: 'pt', countsMinutes: 0,
      })
    }
  }

  let extras = 0
  for (const pick of raw.extras) {
    if (extras >= MAX_EXTRAS) break
    const c = find(pick.id, ['video', 'podcast'])
    const language = c?.language ?? pick.language
    if (!c || !isAccepted(language) || (c.durationSec != null && c.durationSec > MAX_EXTRA_SEC)) continue
    accept(c)
    extras++
    plan.picks.push({
      candidate: c, role: 'extra', ref: null, caption: null,
      reason: clip(pick.reason, 200), language: isPortuguese(language) ? 'pt' : 'en', countsMinutes: 0,
    })
  }

  return plan
}
