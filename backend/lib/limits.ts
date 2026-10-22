// lib/limits.ts — limites do plano grátis e anti-abuso.
//
// Duas camadas:
//  - Cotas DIÁRIAS de geração, contadas em `generation_jobs` (valem entre
//    instâncias da Vercel, porque moram no banco). É o que segura o custo de IA.
//  - Rate limit por minuto em memória. Cada instância serverless tem o seu Map,
//    então o limite real é N vezes maior (N = instâncias ativas). Serve contra
//    rajada de toques, não contra ataque. Para limite global, usar um Redis.
import { adminClient } from '@/lib/supabase'
import { HttpError } from '@/lib/http'

export const LIMITS = {
  /** Temas ativos ao mesmo tempo (não arquivados e não concluídos). */
  activeSubjects: 3,
  /** Trilhas geradas por dia (criar tema, ajustar, tentar de novo). */
  pathGenerationsPerDay: 6,
  /** Aulas geradas por dia, somando pré-geração e sob demanda. */
  lessonGenerationsPerDay: 40,
} as const

export async function assertDailyQuota(userId: string, kind: 'path' | 'lesson') {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const kinds = kind === 'path' ? ['path_modules'] : ['lesson_content']
  const { count, error } = await adminClient()
    .from('generation_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('kind', kinds)
    .gte('created_at', since)
  if (error) throw error
  const max = kind === 'path' ? LIMITS.pathGenerationsPerDay : LIMITS.lessonGenerationsPerDay
  if ((count ?? 0) >= max) {
    throw new HttpError(
      429,
      'daily_quota',
      kind === 'path'
        ? 'Você atingiu o limite de trilhas geradas hoje. Tente de novo amanhã.'
        : 'Você atingiu o limite de aulas geradas hoje. Amanhã tem mais.',
    )
  }
}

interface Bucket { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

export function rateLimit(key: string, max: number, windowMs = 60_000) {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }
  b.count++
  if (b.count > max) {
    throw new HttpError(429, 'rate_limited', 'Muitas tentativas seguidas. Espere um instante.')
  }
}
