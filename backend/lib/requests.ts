// lib/requests.ts — entradas validadas e o "hoje" de cada requisição.
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isISODate, todayIn, type ISODate } from '@/lib/dates'

export const availabilityInput = z.object({
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7)
    .transform((d) => [...new Set(d)].sort()),
  dailyMinutes: z.number().int().min(10).max(480),
  sessionsPerDay: z.number().int().min(1).max(4),
  startDate: z.string().refine(isISODate, 'data inválida').optional(),
  deadline: z.string().refine(isISODate, 'data inválida').nullable().optional(),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'horário inválido').nullable().optional(),
}).refine((a) => Math.floor(a.dailyMinutes / a.sessionsPerDay) >= 10, {
  message: 'Cada sessão precisa de pelo menos 10 minutos.',
})
export type AvailabilityInput = z.infer<typeof availabilityInput>

/**
 * O dia de hoje no fuso do usuário.
 *
 * Fora de produção, o cabeçalho `x-debug-date: YYYY-MM-DD` troca o "hoje": é
 * como se testa o replanejamento (pular dias) sem mexer no relógio.
 */
export async function todayFor(request: Request, db: SupabaseClient, userId: string): Promise<{ today: ISODate; timezone: string }> {
  const { data } = await db.from('profiles').select('timezone').eq('id', userId).maybeSingle()
  const timezone = (data as { timezone?: string } | null)?.timezone ?? 'America/Sao_Paulo'
  const debug = request.headers.get('x-debug-date')
  if (process.env.NODE_ENV !== 'production' && debug && isISODate(debug)) return { today: debug, timezone }
  return { today: todayIn(timezone), timezone }
}
