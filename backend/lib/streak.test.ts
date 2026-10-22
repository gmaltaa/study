import { describe, expect, it } from 'vitest'
import { streakAfterStudy, visibleStreak } from '@/lib/streak'

const WEEKDAYS = new Set([1, 2, 3, 4, 5])
// 2026-11-06 é sexta; 2026-11-09, segunda.
const FRIDAY = '2026-11-06'
const MONDAY = '2026-11-09'

describe('sequência de dias', () => {
  it('começa em 1 no primeiro estudo', () => {
    expect(streakAfterStudy({ current: 0, longest: 0, lastStudyDate: null }, FRIDAY, WEEKDAYS))
      .toEqual({ current: 1, longest: 1, lastStudyDate: FRIDAY })
  })

  it('estudar duas vezes no mesmo dia não conta em dobro', () => {
    const s = { current: 3, longest: 5, lastStudyDate: FRIDAY }
    expect(streakAfterStudy(s, FRIDAY, WEEKDAYS)).toBe(s)
  })

  it('o fim de semana sem estudo marcado não quebra', () => {
    const s = streakAfterStudy({ current: 4, longest: 4, lastStudyDate: FRIDAY }, MONDAY, WEEKDAYS)
    expect(s.current).toBe(5)
    expect(visibleStreak({ current: 4, longest: 4, lastStudyDate: FRIDAY }, MONDAY, WEEKDAYS)).toBe(4)
  })

  it('um dia de estudo em branco quebra', () => {
    const s = streakAfterStudy({ current: 4, longest: 4, lastStudyDate: '2026-11-04' }, FRIDAY, WEEKDAYS)
    expect(s).toEqual({ current: 1, longest: 4, lastStudyDate: FRIDAY })
    expect(visibleStreak({ current: 4, longest: 4, lastStudyDate: '2026-11-04' }, FRIDAY, WEEKDAYS)).toBe(0)
  })

  it('ontem estudado: a sequência segue viva enquanto hoje não acabou', () => {
    expect(visibleStreak({ current: 2, longest: 2, lastStudyDate: '2026-11-05' }, FRIDAY, WEEKDAYS)).toBe(2)
  })
})
