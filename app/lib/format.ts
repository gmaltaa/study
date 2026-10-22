// lib/format.ts — datas e durações em português.
import type { ISODate } from '@/lib/types'

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const WEEKDAYS_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function parse(date: ISODate): Date {
  return new Date(`${date}T12:00:00`)
}

/** 'YYYY-MM-DD' de um Date, no fuso do aparelho. */
export function toISODate(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = parse(date)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** "12 de nov." / "12 de nov. de 2027" quando não é o ano corrente. */
export function formatDate(date: ISODate): string {
  const d = parse(date)
  const base = `${d.getDate()} de ${MONTHS[d.getMonth()]}.`
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} de ${d.getFullYear()}`
}

/** "hoje", "amanhã", "quinta", ou a data, relativo a `today`. */
export function relativeDay(date: ISODate, today: ISODate): string {
  if (date === today) return 'hoje'
  if (date === addDays(today, 1)) return 'amanhã'
  const diff = Math.round((parse(date).getTime() - parse(today).getTime()) / 86_400_000)
  if (diff > 1 && diff < 7) return WEEKDAYS_LONG[parse(date).getDay()]
  return formatDate(date)
}

/** "45 min", "1 h", "2 h 30 min". */
export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

/** "~24 h" para totais grandes. */
export function formatHours(min: number): string {
  if (min < 90) return formatMinutes(min)
  return `~${Math.round(min / 60)} h`
}

/** "seg, qua e sex" / "todos os dias" / "dias úteis". */
export function formatDays(days: number[]): string {
  const sorted = [...days].sort()
  if (sorted.length === 7) return 'todos os dias'
  if (sorted.join() === '1,2,3,4,5') return 'dias úteis'
  if (sorted.join() === '0,6') return 'fins de semana'
  const names = sorted.map((d) => WEEKDAYS_SHORT[d].toLowerCase())
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
}

export function greeting(now = new Date()): string {
  const h = now.getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}
