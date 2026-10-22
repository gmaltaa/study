// lib/apple-auth.ts — Sign in with Apple (nativo, só iOS) → Supabase.
//
// Mesmo fluxo do Google: o SDK devolve um identityToken, que vai ao Supabase por
// signInWithIdToken({ provider: 'apple' }). A App Store exige Apple em app que
// oferece login com Google (Guideline 4.8). No Android, este módulo não aparece.
//
// Configuração externa: no Supabase, Authentication → Providers → Apple, com o
// bundle id do app (app.json, ios.bundleIdentifier) em "Authorized Client IDs".
import { Platform } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import { supabase } from '@/lib/supabase'

export type AppleSignInResult =
  | { ok: true; fullName: string | null }
  | { ok: false; reason: 'cancelled' | 'no_token' | 'error'; message?: string }

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false
  try { return await AppleAuthentication.isAvailableAsync() } catch { return false }
}

export async function signInWithApple(): Promise<AppleSignInResult> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })
    if (!credential.identityToken) return { ok: false, reason: 'no_token' }
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken })
    if (error) return { ok: false, reason: 'error', message: error.message }
    // A Apple só manda o nome na PRIMEIRA autorização; quem chama salva no perfil.
    const fn = credential.fullName
    const fullName = [fn?.givenName, fn?.familyName].filter(Boolean).join(' ') || null
    return { ok: true, fullName }
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return { ok: false, reason: 'cancelled' }
    return { ok: false, reason: 'error', message: (e as Error)?.message }
  }
}
