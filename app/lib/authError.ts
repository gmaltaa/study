// lib/authError.ts — erros do Supabase Auth em mensagens para gente ler.
export function friendlyAuthError(msg?: string): string {
  const m = (msg || '').toLowerCase()
  if (m.includes('invalid login') || m.includes('credentials')) return 'E-mail ou senha incorretos.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'Já existe uma conta com esse e-mail. Tente entrar.'
  if (m.includes('password')) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (m.includes('email')) return 'Confira o e-mail digitado.'
  if (m.includes('rate') || m.includes('too many')) return 'Muitas tentativas. Espere um pouco e tente de novo.'
  return 'Não foi possível continuar. Tente de novo.'
}
