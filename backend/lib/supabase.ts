// lib/supabase.ts — os dois clientes do Supabase no servidor.
//
//  - `userClient(token)`: escopado ao usuário, com RLS aplicada. É o padrão nas
//    rotas da API: mesmo um bug de filtro não vaza dado de outra pessoa.
//  - `adminClient()`: service role, ignora a RLS. Só para o que o usuário não
//    pode fazer sozinho: gravar conteúdo gerado (jobs do Inngest), registrar
//    chamadas de IA, contar cotas e excluir a conta.
//
// Não guardar nenhum dos dois em variável global: cada requisição cria o seu.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const NO_SESSION = { persistSession: false, autoRefreshToken: false } as const

export function userClient(accessToken: string): SupabaseClient {
  return createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: NO_SESSION,
  })
}

export function adminClient(): SupabaseClient {
  if (!SERVICE) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente')
  return createClient(URL, SERVICE, { auth: NO_SESSION })
}

export const SUPABASE_URL = URL
