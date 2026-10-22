// lib/dates.ts — datas de calendário ('YYYY-MM-DD') sem fuso embutido.
//
// O "dia" do produto é o dia NO FUSO DO USUÁRIO (profiles.timezone). Por isso
// as datas circulam como texto 'YYYY-MM-DD', e as contas de dia (somar, dia da
// semana) são feitas em UTC sobre esse texto: meia-noite UTC de uma data de
// calendário nunca cai em outro dia, e horário de verão não interfere.

export type ISODate = string

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isISODate(v: unknown): v is ISODate {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}

function toUTC(date: ISODate): Date {
  return new Date(`${date}T00:00:00Z`)
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = toUTC(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** 0 = domingo … 6 = sábado. */
export function dayOfWeek(date: ISODate): number {
  return toUTC(date).getUTCDay()
}

/** Dias inteiros de `a` até `b` (positivo quando `b` é depois). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86_400_000)
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b
}

/** A data de hoje no fuso informado. Fuso inválido cai em America/Sao_Paulo. */
export function todayIn(timezone: string, now: Date = new Date()): ISODate {
  return partsIn(timezone, now).date
}

/** Data e hora local ('HH:MM') de um instante, no fuso informado. */
export function partsIn(timezone: string, now: Date = new Date()): { date: ISODate; time: string } {
  let fmt: Intl.DateTimeFormat
  try {
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    })
  } catch {
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    })
  }
  const p = Object.fromEntries(fmt.formatToParts(now).map((x) => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` }
}
