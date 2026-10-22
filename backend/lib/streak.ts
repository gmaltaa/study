// lib/streak.ts — sequência de dias estudados.
//
// Conta dias de ESTUDO seguidos, e não dias de calendário: quem estuda de
// segunda a sexta não perde a sequência no fim de semana. Só quebra quando passa
// um dia que tinha sessão marcada (em qualquer tema ativo) sem estudo nenhum.
import { addDays, daysBetween, dayOfWeek, type ISODate } from '@/lib/dates'

export interface StreakState {
  current: number
  longest: number
  lastStudyDate: ISODate | null
}

/** Houve algum dia de estudo marcado ENTRE as duas datas (exclusive)? */
function missedStudyDayBetween(last: ISODate, today: ISODate, studyDays: Set<number>): boolean {
  const gap = daysBetween(last, today)
  if (gap <= 1) return false
  // Sem nenhum tema ativo, qualquer dia vale.
  if (studyDays.size === 0) return true
  for (let d = 1; d < gap; d++) if (studyDays.has(dayOfWeek(addDays(last, d)))) return true
  return false
}

/** O estado depois de estudar hoje. */
export function streakAfterStudy(state: StreakState, today: ISODate, studyDays: Set<number>): StreakState {
  if (state.lastStudyDate === today) return state
  const continues = state.lastStudyDate !== null && !missedStudyDayBetween(state.lastStudyDate, today, studyDays)
  const current = continues ? state.current + 1 : 1
  return { current, longest: Math.max(state.longest, current), lastStudyDate: today }
}

/** A sequência que aparece hoje: zera se um dia de estudo passou em branco. */
export function visibleStreak(state: StreakState, today: ISODate, studyDays: Set<number>): number {
  if (!state.lastStudyDate) return 0
  if (state.lastStudyDate === today) return state.current
  return missedStudyDayBetween(state.lastStudyDate, today, studyDays) ? 0 : state.current
}
