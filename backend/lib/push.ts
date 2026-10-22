// lib/push.ts — entrega de push pelo Expo Push Service.
//
// Sem SDK: a API da Expo é um POST JSON. O token do aparelho
// (`ExponentPushToken[...]`) é registrado pelo app em POST /api/push/register.
// Quando a Expo responde `DeviceNotRegistered` (app desinstalado, token
// trocado), o token é desativado na hora, para a tabela não acumular lixo.
import type { SupabaseClient } from '@supabase/supabase-js'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const BATCH = 100

export interface PushMessage {
  title: string
  body: string
  data?: Record<string, unknown>
}

export async function sendPushToUsers(db: SupabaseClient, userIds: string[], build: (userId: string) => PushMessage | null) {
  if (userIds.length === 0) return
  const { data: tokens, error } = await db
    .from('push_tokens')
    .select('token, user_id')
    .in('user_id', userIds)
    .eq('active', true)
  if (error) throw error

  const messages = ((tokens ?? []) as { token: string; user_id: string }[])
    .map((t) => {
      const m = build(t.user_id)
      return m ? { to: t.token, sound: 'default', ...m } : null
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)

  const dead: string[] = []
  for (let i = 0; i < messages.length; i += BATCH) {
    const chunk = messages.slice(i, i + BATCH)
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      })
      const json = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] }
      json.data?.forEach((ticket, idx) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') dead.push(chunk[idx].to)
      })
    } catch (e) {
      console.error('[push] falha ao enviar lote', e)
    }
  }
  if (dead.length) await db.from('push_tokens').update({ active: false }).in('token', dead)
}
