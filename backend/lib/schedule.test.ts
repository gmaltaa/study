import { describe, expect, it } from 'vitest'
import { dayOfWeek } from '@/lib/dates'
import {
  buildSchedule, countStudyDays, lessonMaxMinutes, pathBudget, sessionLength,
  DEPTH_MINUTES, MAX_LESSONS, type Availability, type ScheduleLesson,
} from '@/lib/schedule'

// 2026-11-02 é uma segunda-feira.
const MONDAY = '2026-11-02'

function availability(over: Partial<Availability> = {}): Availability {
  return {
    daysOfWeek: [1, 2, 3, 4, 5],
    dailyMinutes: 30,
    sessionsPerDay: 1,
    startDate: MONDAY,
    deadline: null,
    ...over,
  }
}

function lessons(minutes: number[]): ScheduleLesson[] {
  return minutes.map((m, i) => ({ id: `l${i + 1}`, minutes: m }))
}

/** Gera trilhas e disponibilidades variadas, de forma determinística. */
function* cases() {
  let seed = 7
  const rand = () => (seed = (seed * 48271) % 2147483647) / 2147483647
  for (let n = 0; n < 300; n++) {
    const sessionsPerDay = 1 + Math.floor(rand() * 4)
    const dailyMinutes = sessionsPerDay * (10 + Math.floor(rand() * 50))
    const days = [0, 1, 2, 3, 4, 5, 6].filter(() => rand() < 0.6)
    const a = availability({ daysOfWeek: days.length ? days : [3], dailyMinutes, sessionsPerDay })
    const max = lessonMaxMinutes(a)
    const ls = lessons(Array.from({ length: 1 + Math.floor(rand() * 60) }, () => 5 + Math.floor(rand() * (max - 4))))
    yield { a, ls }
  }
}

describe('buildSchedule', () => {
  it('nunca passa do tempo da sessão nem do tempo diário', () => {
    for (const { a, ls } of cases()) {
      const { sessions } = buildSchedule({ lessons: ls, availability: a, from: MONDAY })
      const perDay = new Map<string, number>()
      for (const s of sessions) {
        expect(s.oversized).toBeUndefined()
        expect(s.usedMinutes).toBeLessThanOrEqual(sessionLength(a))
        perDay.set(s.date, (perDay.get(s.date) ?? 0) + s.usedMinutes)
      }
      for (const total of perDay.values()) expect(total).toBeLessThanOrEqual(a.dailyMinutes)
    }
  })

  it('mantém a ordem da trilha e encaixa todas as aulas', () => {
    for (const { a, ls } of cases()) {
      const { sessions } = buildSchedule({ lessons: ls, availability: a, from: MONDAY })
      expect(sessions.flatMap((s) => s.lessonIds)).toEqual(ls.map((l) => l.id))
    }
  })

  it('só marca sessão nos dias da semana escolhidos', () => {
    for (const { a, ls } of cases()) {
      const { sessions } = buildSchedule({ lessons: ls, availability: a, from: MONDAY })
      for (const s of sessions) expect(a.daysOfWeek).toContain(dayOfWeek(s.date))
    }
  })

  it('respeita o número de sessões por dia', () => {
    for (const { a, ls } of cases()) {
      const { sessions } = buildSchedule({ lessons: ls, availability: a, from: MONDAY })
      const perDay = new Map<string, number>()
      for (const s of sessions) perDay.set(s.date, (perDay.get(s.date) ?? 0) + 1)
      for (const count of perDay.values()) expect(count).toBeLessThanOrEqual(a.sessionsPerDay)
    }
  })

  it('junta aulas curtas na mesma sessão', () => {
    const { sessions } = buildSchedule({ lessons: lessons([10, 10, 10, 20]), availability: availability(), from: MONDAY })
    expect(sessions.map((s) => s.lessonIds)).toEqual([['l1', 'l2', 'l3'], ['l4']])
  })

  it('divide o tempo do dia entre as sessões', () => {
    const a = availability({ dailyMinutes: 60, sessionsPerDay: 2 })
    const { sessions } = buildSchedule({ lessons: lessons([30, 30, 30]), availability: a, from: MONDAY })
    expect(sessions.map((s) => [s.date, s.slot])).toEqual([[MONDAY, 1], [MONDAY, 2], ['2026-11-03', 1]])
  })

  it('pula o fim de semana', () => {
    const friday = '2026-11-06'
    const { sessions } = buildSchedule({ lessons: lessons([30, 30]), availability: availability(), from: friday })
    expect(sessions.map((s) => s.date)).toEqual([friday, '2026-11-09'])
  })

  it('não começa antes da data de início', () => {
    const a = availability({ startDate: '2026-11-04' })
    const { sessions } = buildSchedule({ lessons: lessons([30]), availability: a, from: MONDAY })
    expect(sessions[0].date).toBe('2026-11-04')
  })

  it('dia perdido não acumula: o cronograma recomeça de hoje com as mesmas aulas', () => {
    const a = availability()
    const before = buildSchedule({ lessons: lessons([30, 30, 30]), availability: a, from: MONDAY })
    // Faltou segunda. Na terça, as três aulas continuam pendentes.
    const after = buildSchedule({ lessons: lessons([30, 30, 30]), availability: a, from: '2026-11-03' })
    expect(after.sessions).toHaveLength(3)
    expect(after.sessions.every((s) => s.lessonIds.length === 1)).toBe(true)
    expect(after.endDate).toBe('2026-11-05')
    expect(before.endDate).toBe('2026-11-04')
  })

  it('avisa quando o término passa do prazo', () => {
    const a = availability({ deadline: '2026-11-03' })
    expect(buildSchedule({ lessons: lessons([30, 30]), availability: a, from: MONDAY }).fitsDeadline).toBe(true)
    expect(buildSchedule({ lessons: lessons([30, 30, 30]), availability: a, from: MONDAY }).fitsDeadline).toBe(false)
  })

  it('aula maior que a sessão vai sozinha e marcada, sem travar', () => {
    const { sessions } = buildSchedule({ lessons: lessons([45, 10]), availability: availability(), from: MONDAY })
    expect(sessions[0]).toMatchObject({ lessonIds: ['l1'], oversized: true })
    expect(sessions[1].lessonIds).toEqual(['l2'])
  })

  it('sem aulas, sem sessões', () => {
    const s = buildSchedule({ lessons: [], availability: availability(), from: MONDAY })
    expect(s).toMatchObject({ sessions: [], endDate: null, fitsDeadline: true, totalMinutes: 0 })
  })
})

describe('orçamento da trilha', () => {
  it('aula não passa de 30 min nem da sessão', () => {
    expect(lessonMaxMinutes({ dailyMinutes: 90, sessionsPerDay: 1 })).toBe(30)
    expect(lessonMaxMinutes({ dailyMinutes: 40, sessionsPerDay: 2 })).toBe(20)
  })

  it('com prazo, cabe no tempo até o prazo com folga', () => {
    // 2 semanas úteis = 10 dias × 30 min × 0,9
    const a = availability({ deadline: '2026-11-13' })
    expect(countStudyDays(a.daysOfWeek, a.startDate, a.deadline!)).toBe(10)
    expect(pathBudget(a, 'deep')).toBe(270)
  })

  it('sem prazo, vem da profundidade', () => {
    expect(pathBudget(availability(), 'intro')).toBe(DEPTH_MINUTES.intro)
  })

  it('nunca passa do teto de aulas', () => {
    const a = availability({ dailyMinutes: 10 })
    expect(pathBudget(a, 'deep')).toBe(MAX_LESSONS * 10)
  })
})
