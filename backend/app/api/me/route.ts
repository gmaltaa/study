// /api/me — perfil do usuário. GET lê, PATCH edita, DELETE exclui a conta.
import { z } from 'zod'
import { badRequest, json, readJson, withAuth, zodMessage } from '@/lib/http'
import { adminClient } from '@/lib/supabase'
import { rateLimit } from '@/lib/limits'

const PROFILE_COLUMNS = 'id, display_name, timezone, onboarded_at, current_streak, longest_streak, last_study_date'

function view(p: Record<string, unknown>) {
  return {
    id: p.id,
    displayName: p.display_name ?? null,
    timezone: p.timezone,
    onboardedAt: p.onboarded_at ?? null,
    longestStreak: p.longest_streak ?? 0,
  }
}

export const GET = withAuth(async ({ supabase, userId }) => {
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle()
  if (error) throw error
  if (data) return json(view(data))
  // Conta criada antes do trigger existir: cria o perfil agora.
  const { data: created, error: e2 } = await adminClient()
    .from('profiles').upsert({ id: userId }).select(PROFILE_COLUMNS).single()
  if (e2) throw e2
  return json(view(created))
})

const patchInput = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  timezone: z.string().min(3).max(64).optional(),
  onboarded: z.literal(true).optional(),
})

export const PATCH = withAuth(async ({ supabase, userId, request }) => {
  const parsed = patchInput.safeParse(await readJson(request))
  if (!parsed.success) throw badRequest(zodMessage(parsed.error))
  const { displayName, timezone, onboarded } = parsed.data
  if (timezone) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: timezone })
    } catch {
      throw badRequest('Fuso horário inválido.')
    }
  }
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...(displayName !== undefined && { display_name: displayName }),
      ...(timezone && { timezone }),
      ...(onboarded && { onboarded_at: new Date().toISOString() }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single()
  if (error) throw error
  return json(view(data))
})

/** Exclui a conta e, em cascata, tudo o que é dela. Exigência das lojas. */
export const DELETE = withAuth(async ({ userId }) => {
  rateLimit(`delete-account:${userId}`, 3)
  const { error } = await adminClient().auth.admin.deleteUser(userId)
  if (error) throw error
  return json({ ok: true })
})
