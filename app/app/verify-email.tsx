// app/verify-email.tsx — confirmar o e-mail do cadastro pelo código (OTP).
// Com "Confirm email" ligado no Supabase, o cadastro só ganha sessão aqui.
import { useLocalSearchParams } from 'expo-router'
import { Screen } from '@/components/Screen'
import { CodeForm } from '@/components/CodeForm'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'

export default function VerifyEmail() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>()
  const mail = String(email).trim().toLowerCase()
  return (
    <Screen back surface="white">
      <CodeForm
        title="Confirme seu e-mail"
        email={mail}
        onVerify={async (token) => {
          const { data, error } = await supabase.auth.verifyOtp({ email: mail, token, type: 'signup' })
          if (error || !data.session) return false
          track('signup_completed', { method: 'email' })
          return true
        }}
        onResend={async () => {
          const { error } = await supabase.auth.resend({ type: 'signup', email: mail })
          if (error) throw error
        }}
      />
    </Screen>
  )
}
