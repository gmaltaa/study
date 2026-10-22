// app/verify-reset.tsx — código de recuperação. Válido, abre a sessão em modo
// de recuperação: o _layout prende a pessoa na tela de senha nova.
import { useLocalSearchParams } from 'expo-router'
import { Screen } from '@/components/Screen'
import { CodeForm } from '@/components/CodeForm'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

export default function VerifyReset() {
  const { beginRecovery, endRecovery } = useAuth()
  const { email = '' } = useLocalSearchParams<{ email?: string }>()
  const mail = String(email).trim().toLowerCase()
  return (
    <Screen back surface="white">
      <CodeForm
        title="Digite o código"
        email={mail}
        onVerify={async (token) => {
          // Antes de verificar: a sessão nasce já em modo de recuperação, sem
          // passar pelo app nem por um instante.
          beginRecovery()
          const { data, error } = await supabase.auth.verifyOtp({ email: mail, token, type: 'recovery' })
          if (error || !data.session) {
            endRecovery()
            return false
          }
          return true
        }}
        onResend={async () => {
          const { error } = await supabase.auth.resetPasswordForEmail(mail)
          if (error) throw error
        }}
      />
    </Screen>
  )
}
