// POST /api/push/register — guarda o token de push do aparelho.
// DELETE — desativa o token (ao sair da conta).
import { z } from 'zod'
import { badRequest, json, readJson, withAuth, zodMessage } from '@/lib/http'
import { adminClient } from '@/lib/supabase'

const input = z.object({
  token: z.string().regex(/^Expo(nent)?PushToken\[.+\]$/, 'token inválido'),
  platform: z.enum(['ios', 'android']),
})

export const POST = withAuth(async ({ userId, request }) => {
  const parsed = input.safeParse(await readJson(request))
  if (!parsed.success) throw badRequest(zodMessage(parsed.error))
  // Admin: o mesmo aparelho pode ter pertencido a outra conta antes. O token é a
  // chave, e passa a ser de quem o registrou por último.
  const { error } = await adminClient().from('push_tokens').upsert({
    token: parsed.data.token,
    user_id: userId,
    platform: parsed.data.platform,
    active: true,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
  return json({ ok: true })
})

export const DELETE = withAuth(async ({ supabase, request }) => {
  const parsed = input.pick({ token: true }).safeParse(await readJson(request))
  if (!parsed.success) throw badRequest(zodMessage(parsed.error))
  await supabase.from('push_tokens').update({ active: false }).eq('token', parsed.data.token)
  return json({ ok: true })
})
