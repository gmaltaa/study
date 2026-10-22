// lib/schedule.ts — o cronograma. Código puro, sem IA e sem banco.
//
// A IA decide O QUE estudar (módulos e aulas, com a duração de cada uma). Esta
// função decide QUANDO: encaixa as aulas restantes, na ordem da trilha, nos
// dias e sessões da disponibilidade.
//
// Invariantes (testadas em schedule.test.ts):
//  - nenhuma sessão passa da duração da sessão, então nenhum dia passa do
//    tempo diário informado;
//  - a ordem das aulas nunca muda (a progressão é real);
//  - só os dias da semana escolhidos recebem sessão.
//
// O futuro é sempre calculado a partir de hoje. Faltar um dia não acumula: a
// aula que não foi feita continua sendo a próxima e cai na próxima sessão.
import { addDays, dayOfWeek, daysBetween, maxDate, type ISODate } from '@/lib/dates'

export interface Availability {
  /** 0 = domingo … 6 = sábado */
  daysOfWeek: number[]
  /** Tempo do dia inteiro, dividido igualmente entre as sessões. */
  dailyMinutes: number
  sessionsPerDay: number
  startDate: ISODate
  deadline: ISODate | null
}

export interface ScheduleLesson {
  id: string
  minutes: number
}

export interface PlannedSession {
  date: ISODate
  /** 1ª, 2ª… sessão do dia */
  slot: number
  /** Duração da sessão (o teto). */
  minutes: number
  /** Soma das aulas encaixadas (≤ minutes, salvo `oversized`). */
  usedMinutes: number
  lessonIds: string[]
  /** Uma aula maior que a sessão, sozinha. Não acontece com a trilha validada;
   *  existe para o app não quebrar se acontecer. */
  oversized?: boolean
}

export interface Schedule {
  sessions: PlannedSession[]
  /** Dia da última sessão; nulo quando não há aula restante. */
  endDate: ISODate | null
  /** false quando há prazo e a última sessão cai depois dele. */
  fitsDeadline: boolean
  totalMinutes: number
}

/** Limite de segurança: 10 anos de calendário. */
const MAX_DAYS = 3650

/** Duração de cada sessão: o tempo do dia dividido entre as sessões. */
export function sessionLength(a: Pick<Availability, 'dailyMinutes' | 'sessionsPerDay'>): number {
  return Math.floor(a.dailyMinutes / Math.max(1, a.sessionsPerDay))
}

/** Aula mais curta e mais longa que a trilha pode ter. */
export const LESSON_MIN_MINUTES = 5
export const LESSON_CAP_MINUTES = 30

/** Duração máxima de uma aula: cabe numa sessão e não passa de 30 min. Em
 *  sessão de 60 min, isso dá duas aulas de 30 — aula longa demais cansa. */
export function lessonMaxMinutes(a: Pick<Availability, 'dailyMinutes' | 'sessionsPerDay'>): number {
  return Math.max(LESSON_MIN_MINUTES, Math.min(sessionLength(a), LESSON_CAP_MINUTES))
}

export function buildSchedule({
  lessons, availability, from,
}: {
  /** Aulas restantes, já na ordem da trilha. */
  lessons: ScheduleLesson[]
  availability: Availability
  /** Primeiro dia que pode receber sessão (inclusive). */
  from: ISODate
}): Schedule {
  const len = sessionLength(availability)
  const days = new Set(availability.daysOfWeek)
  const sessions: PlannedSession[] = []
  let i = 0
  let date = maxDate(from, availability.startDate)

  for (let d = 0; i < lessons.length && d < MAX_DAYS && days.size > 0; d++, date = addDays(date, 1)) {
    if (!days.has(dayOfWeek(date))) continue
    for (let slot = 1; slot <= availability.sessionsPerDay && i < lessons.length; slot++) {
      const ids: string[] = []
      let used = 0
      // A aula que não cabe no que sobrou da sessão vai para a próxima: nunca
      // se divide uma aula e nunca se passa do teto.
      while (i < lessons.length && used + lessons[i].minutes <= len) {
        ids.push(lessons[i].id)
        used += lessons[i].minutes
        i++
      }
      if (ids.length === 0) {
        // Aula maior que a sessão inteira: vai sozinha, marcada.
        sessions.push({ date, slot, minutes: len, usedMinutes: lessons[i].minutes, lessonIds: [lessons[i].id], oversized: true })
        i++
        continue
      }
      sessions.push({ date, slot, minutes: len, usedMinutes: used, lessonIds: ids })
    }
  }

  const endDate = sessions.length ? sessions[sessions.length - 1].date : null
  return {
    sessions,
    endDate,
    fitsDeadline: !availability.deadline || !endDate || endDate <= availability.deadline,
    totalMinutes: lessons.reduce((sum, l) => sum + l.minutes, 0),
  }
}

/** Quantos dias de estudo existem de `from` a `to`, inclusive. */
export function countStudyDays(daysOfWeek: number[], from: ISODate, to: ISODate): number {
  const days = new Set(daysOfWeek)
  const total = daysBetween(from, to) + 1
  let count = 0
  for (let d = 0; d < total; d++) if (days.has(dayOfWeek(addDays(from, d)))) count++
  return count
}

export type Depth = 'intro' | 'solid' | 'deep'

/** Tamanho da trilha sem prazo, pela profundidade escolhida (minutos). */
export const DEPTH_MINUTES: Record<Depth, number> = {
  intro: 6 * 60,
  solid: 20 * 60,
  deep: 50 * 60,
}

/** Teto de aulas por trilha: acima disso a geração fica lenta e cara, e a
 *  trilha deixa de ser legível na prévia. */
export const MAX_LESSONS = 150

/** Folga sobre o tempo até o prazo: dias perdidos e revisões. */
export const DEADLINE_SLACK = 0.9

/**
 * Orçamento de tempo da trilha inteira, em minutos.
 *
 * Com prazo, é o tempo que cabe até ele (com folga). Sem prazo, vem da
 * profundidade escolhida. Nos dois casos, nunca passa de MAX_LESSONS aulas do
 * tamanho máximo, e nunca é menor que uma aula.
 */
export function pathBudget(a: Availability, depth: Depth): number {
  const lessonMax = lessonMaxMinutes(a)
  let budget = DEPTH_MINUTES[depth]
  if (a.deadline) {
    const studyDays = countStudyDays(a.daysOfWeek, a.startDate, a.deadline)
    budget = Math.floor(studyDays * a.dailyMinutes * DEADLINE_SLACK)
  }
  return Math.max(lessonMax, Math.min(budget, MAX_LESSONS * lessonMax))
}
