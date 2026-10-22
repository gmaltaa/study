import { describe, expect, it } from 'vitest'
import { labelCandidates, validateSelection } from '@/lib/media/select'
import { acceptableLicense } from '@/lib/media/wikipedia'
import { parseIsoDuration } from '@/lib/media/youtube'
import type { MediaCandidate } from '@/lib/media/types'

function candidate(over: Partial<MediaCandidate>): MediaCandidate {
  return {
    provider: 'youtube', kind: 'video', externalId: Math.random().toString(36), title: 't', author: null,
    url: 'https://x', mediaUrl: null, thumbnailUrl: null, durationSec: 300, width: null, height: null,
    language: null, license: null, attribution: null, description: null, publishedAt: null,
    ...over,
  }
}

const labeled = labelCandidates([
  candidate({ kind: 'video', durationSec: 360 }),                       // v1: 6 min
  candidate({ kind: 'video', durationSec: 1500 }),                      // v2: 25 min
  candidate({ kind: 'video', durationSec: 240, language: 'en' }),       // v3: em inglês
  candidate({ provider: 'wikipedia', kind: 'image' }),                  // i1
  candidate({ provider: 'wikipedia', kind: 'image' }),                  // i2
  candidate({ provider: 'wikipedia', kind: 'image' }),                  // i3
  candidate({ provider: 'wikipedia', kind: 'article', durationSec: null }), // a1
  candidate({ provider: 'itunes', kind: 'podcast', durationSec: 2400 }),    // p1
])

const empty = { core_video: null, images: [], reading: null, extras: [] }

describe('seleção de mídia', () => {
  it('aceita o vídeo principal em português que cabe no tempo e desconta os minutos', () => {
    const plan = validateSelection({ ...empty, core_video: { id: 'v1', language: 'pt', reason: 'r' } }, labeled, 600)
    expect(plan.coreMinutes).toBe(6)
    expect(plan.picks[0]).toMatchObject({ role: 'core', ref: 'vid1', countsMinutes: 6 })
  })

  it('recusa vídeo principal longo demais, em inglês ou de outro tipo', () => {
    expect(validateSelection({ ...empty, core_video: { id: 'v2', language: 'pt', reason: '' } }, labeled, 600).picks).toHaveLength(0)
    expect(validateSelection({ ...empty, core_video: { id: 'v3', language: 'pt', reason: '' } }, labeled, 600).picks).toHaveLength(0)
    expect(validateSelection({ ...empty, core_video: { id: 'i1', language: 'pt', reason: '' } }, labeled, 600).picks).toHaveLength(0)
  })

  it('no máximo 2 imagens, sem repetir, e id inventado é ignorado', () => {
    const plan = validateSelection({
      ...empty,
      images: ['i1', 'i1', 'x9', 'i2', 'i3'].map((id) => ({ id, caption: 'c', reason: 'r' })),
    }, labeled, 600)
    expect(plan.picks.map((p) => p.ref)).toEqual(['img1', 'img2'])
  })

  it('extras podem ser em inglês (marcados) e não contam no tempo da aula', () => {
    const plan = validateSelection({
      ...empty,
      reading: { id: 'a1', reason: 'r' },
      extras: [{ id: 'v3', language: 'en', reason: 'r' }, { id: 'p1', language: 'pt', reason: 'r' }],
    }, labeled, 600)
    expect(plan.coreMinutes).toBe(0)
    expect(plan.picks.map((p) => [p.role, p.language])).toEqual([['extra', 'pt'], ['extra', 'en'], ['extra', 'pt']])
  })

  it('o mesmo vídeo não entra como principal e como extra', () => {
    const plan = validateSelection({
      ...empty,
      core_video: { id: 'v1', language: 'pt', reason: 'r' },
      extras: [{ id: 'v1', language: 'pt', reason: 'r' }],
    }, labeled, 600)
    expect(plan.picks).toHaveLength(1)
  })
})

describe('fontes', () => {
  it('lê a duração do YouTube', () => {
    expect(parseIsoDuration('PT1H2M3S')).toBe(3723)
    expect(parseIsoDuration('PT7M')).toBe(420)
    expect(parseIsoDuration('P0D')).toBe(0)
    expect(parseIsoDuration('xyz')).toBeNull()
  })

  it('aceita só licenças livres que permitem uso com crédito', () => {
    expect(acceptableLicense('Public domain')).toBe(true)
    expect(acceptableLicense('CC BY-SA 4.0')).toBe(true)
    expect(acceptableLicense('CC0')).toBe(true)
    expect(acceptableLicense('CC BY-NC 2.0')).toBe(false)
    expect(acceptableLicense('Fair use')).toBe(false)
    expect(acceptableLicense(null)).toBe(false)
  })
})
