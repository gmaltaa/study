// lib/auth.ts — identidade do usuário nas rotas da API.
//
// O app manda `Authorization: Bearer <access_token do Supabase>`. A assinatura
// é verificada localmente pelo JWKS do projeto (assimétrica, sem ida ao
// Supabase por requisição).
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, userClient } from '@/lib/supabase'

const JWKS = SUPABASE_URL
  ? createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`))
  : null

export interface AuthContext {
  userId: string
  supabase: SupabaseClient
}

export async function authenticate(request: Request): Promise<AuthContext | null> {
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token || !JWKS) return null
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
    })
    if (typeof payload.sub !== 'string') return null
    return { userId: payload.sub, supabase: userClient(token) }
  } catch {
    return null
  }
}
