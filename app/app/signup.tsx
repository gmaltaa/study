// app/signup.tsx — criar conta com e-mail e senha (ou Google/Apple).
import { useState } from 'react'
import { Alert, Linking, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Text } from '@/components/ui/Text'
import { Screen } from '@/components/ui/Screen'
import { PageHeader } from '@/components/ui/PageHeader'
import { TextField } from '@/components/ui/TextField'
import { Button } from '@/components/ui/Button'
import { LabeledDivider } from '@/components/ui/Divider'
import { GoogleButton } from '@/components/GoogleButton'
import { AppleButton } from '@/components/AppleButton'
import { supabase } from '@/lib/supabase'
import { friendlyAuthError } from '@/lib/authError'
import { track } from '@/lib/analytics'
import { SITE_URL, SPACE } from '@/lib/constants'

export default function SignUp() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    const mail = email.trim().toLowerCase()
    if (!mail.includes('@')) return Alert.alert('E-mail inválido', 'Confira o e-mail digitado.')
    if (password.length < 6) return Alert.alert('Senha curta', 'Use pelo menos 6 caracteres.')
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({ email: mail, password })
      if (error) throw error
      if (!data.session) {
        // Confirmação de e-mail ligada no Supabase: o código foi enviado.
        router.push({ pathname: '/verify-email', params: { email: mail } })
        return
      }
      track('signup_completed', { method: 'email' })
    } catch (e: unknown) {
      Alert.alert('Não deu certo', friendlyAuthError((e as Error)?.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen back>
      <PageHeader title="Criar conta" subtitle="Leva um minuto. Depois a gente monta a sua primeira trilha." />
      <TextField label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <TextField label="Senha" value={password} onChangeText={setPassword} placeholder="Pelo menos 6 caracteres" secureTextEntry autoCapitalize="none" autoComplete="password-new" />
      <Button label="Criar conta" onPress={submit} loading={loading} disabled={!email.trim() || !password} style={{ marginTop: SPACE.sm }} />
      <LabeledDivider label="ou" />
      <View style={{ gap: SPACE.sm }}>
        <GoogleButton />
        <AppleButton />
      </View>
      <Button label="Já tem conta? Entrar" variant="ghost" size="md" onPress={() => router.replace('/signin')} style={{ marginTop: SPACE.xl }} />
      {SITE_URL ? (
        <Text variant="caption" tone="tertiary" align="center" style={{ marginTop: SPACE.lg }}>
          Ao continuar, você concorda com os{' '}
          <Text variant="caption" tone="secondary" style={{ textDecorationLine: 'underline' }} onPress={() => Linking.openURL(`${SITE_URL}/termos`)}>Termos de uso</Text>
          {' '}e a{' '}
          <Text variant="caption" tone="secondary" style={{ textDecorationLine: 'underline' }} onPress={() => Linking.openURL(`${SITE_URL}/privacidade`)}>Política de privacidade</Text>.
        </Text>
      ) : null}
    </Screen>
  )
}
