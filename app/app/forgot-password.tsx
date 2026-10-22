// app/forgot-password.tsx — pede o código de recuperação de senha.
import { useState } from 'react'
import { Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Text } from '@/components/Text'
import { Screen } from '@/components/Screen'
import { TextField } from '@/components/Field'
import { Button } from '@/components/Button'
import { supabase } from '@/lib/supabase'
import { friendlyAuthError } from '@/lib/authError'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles } from '@/lib/theme'

export default function ForgotPassword() {
  const s = useStyles()
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
    <Screen back surface="white">
      <Text style={s.title}>Esqueceu a senha?</Text>
      <Text style={s.subtitle}>Digite seu e-mail e mandamos um código para criar uma senha nova.</Text>
      <TextField label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Button label="Enviar código" onPress={submit} loading={loading} disabled={!email.trim()} style={{ marginTop: 8 }} />
    </Screen>
  )
}

const useStyles = makeThemedStyles((c) => ({
  title: { fontFamily: FONTS.extraBold, fontSize: 30, color: c.gray900, marginBottom: 6 },
  subtitle: { fontFamily: FONTS.medium, fontSize: 16, color: c.gray500, lineHeight: 22, marginBottom: 28 },
}))
