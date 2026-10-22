// app/forgot-password.tsx — pede o código de recuperação de senha.
import { useState } from 'react'
import { Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen } from '@/components/ui/Screen'
import { PageHeader } from '@/components/ui/PageHeader'
import { TextField } from '@/components/ui/TextField'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { friendlyAuthError } from '@/lib/authError'
import { SPACE } from '@/lib/constants'

export default function ForgotPassword() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    const mail = email.trim().toLowerCase()
    if (!mail.includes('@')) return Alert.alert('E-mail inválido', 'Confira o e-mail digitado.')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(mail)
      if (error) throw error
      router.push({ pathname: '/verify-reset', params: { email: mail } })
    } catch (e: unknown) {
      Alert.alert('Não deu certo', friendlyAuthError((e as Error)?.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen back>
      <PageHeader title="Esqueceu a senha?" subtitle="Digite seu e-mail e mandamos um código para criar uma senha nova." />
      <TextField label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoFocus />
      <Button label="Enviar código" onPress={submit} loading={loading} disabled={!email.trim()} style={{ marginTop: SPACE.sm }} />
    </Screen>
  )
}
