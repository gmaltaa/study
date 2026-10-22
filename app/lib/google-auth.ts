// lib/google-auth.ts — login com Google (nativo) → Supabase.
//
// O SDK do Google devolve um ID token, que vai ao Supabase por
// signInWithIdToken({ provider: 'google' }). O redirecionamento depois do login
// é do onAuthStateChange (lib/auth.tsx), igual ao e-mail.
//
// Precisa de dev build (módulo nativo, não roda no Expo Go).
//  - EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: Client ID "Web" do Google Cloud (público).
//  - EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: Client ID "iOS". Obrigatório no iOS; o
//    `iosUrlScheme` do app.json é ele na ordem invertida.
// No Supabase, o provedor Google precisa de "Skip nonce check" ligado (o SDK do
// iOS gera o próprio nonce) e dos dois Client IDs na lista, o web primeiro.
import {
  GoogleSignin,
  statusCodes,
  isSuccessResponse,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin'
import { supabase } from '@/lib/supabase'

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? ''
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? ''

let configured = false

export function isGoogleConfigured(): boolean {
  return !!WEB_CLIENT_ID
}

/** Configura o SDK uma vez. Seguro chamar em todo mount. */
export function configureGoogleSignin(): void {
  if (configured || !WEB_CLIENT_ID) return
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, ...(IOS_CLIENT_ID ? { iosClientId: IOS_CLIENT_ID } : {}) })
  configured = true
}

export type GoogleSignInResult =
  | { ok: true; fullName: string | null }
  | { ok: false; reason: 'cancelled' | 'in_progress' | 'play_services' | 'no_token' | 'supabase' | 'error'; message?: string }

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  if (!WEB_CLIENT_ID) return { ok: false, reason: 'error', message: 'Login com Google não configurado.' }
  configureGoogleSignin()
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    const response = await GoogleSignin.signIn()
    if (!isSuccessResponse(response)) return { ok: false, reason: 'cancelled' }
    const idToken = response.data.idToken
    if (!idToken) return { ok: false, reason: 'no_token' }
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
    if (error) return { ok: false, reason: 'supabase', message: error.message }
    return { ok: true, fullName: response.data.user.name ?? null }
  } catch (e: unknown) {
    if (isErrorWithCode(e)) {
      switch (e.code) {
        case statusCodes.SIGN_IN_CANCELLED: return { ok: false, reason: 'cancelled' }
        case statusCodes.IN_PROGRESS: return { ok: false, reason: 'in_progress' }
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE: return { ok: false, reason: 'play_services' }
      }
    }
    return { ok: false, reason: 'error', message: (e as Error)?.message }
  }
}

/** Desconecta a sessão do Google (no logout, sem garantia). */
export async function signOutGoogle(): Promise<void> {
  if (!configured) return
  try { await GoogleSignin.signOut() } catch {}
}
