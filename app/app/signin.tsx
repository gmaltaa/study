// app/signin.tsx — entrar com e-mail e senha (ou Google/Apple).
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen } from '@/components/ui/Screen'
import { PageHeader } from '@/components/ui/PageHeader'
import { TextField } from '@/components/ui/TextField'
import { Button } from '@/components/ui/Button'
import { LabeledDivider } from '@/components/ui/Divider'
import { GoogleButton } from '@/components/GoogleButton'
import { AppleButton } from '@/components/AppleButton'
import { supabase } from '@/lib/supabase'
import { friendlyAuthError } from '@/lib/authError'
import { SPACE } from '@/lib/constants'

export default function SignIn() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    const mail = email.trim().toLowerCase()
    if (!mail.includes('@')) return Alert.alert('E-mail inválido', 'Confira o e-mail digitado.')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: mail, password })
      if (error) throw error
      // Sucesso: o _layout redireciona.
    } catch (e: unknown) {
      const msg = String((e as Error)?.message ?? '')
      // Cadastrou e nunca confirmou: reenvia o código e leva à tela dele.
      if (msg.toLowerCase().includes('not confirmed')) {
        supabase.auth.resend({ type: 'signup', email: mail }).catch(() => {})
        router.push({ pathname: '/verify-email', params: { email: mail } })
        return
      }
      Alert.alert('Não deu certo', friendlyAuthError(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen back>
      <PageHeader title="Entrar" subtitle="Que bom te ver de novo." />
      <TextField label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <TextField label="Senha" value={password} onChangeText={setPassword} placeholder="Sua senha" secureTextEntry autoCapitalize="none" autoComplete="password" />
      <Button label="Entrar" onPress={submit} loading={loading} disabled={!email.trim() || !password} style={{ marginTop: SPACE.sm }} />
      <Button label="Esqueci a senha" variant="ghost" size="md" onPress={() => router.push('/forgot-password')} style={{ marginTop: SPACE.xs }} />
      <LabeledDivider label="ou" />
      <View style={{ gap: SPACE.sm }}>
        <GoogleButton label="Entrar com Google" />
        <AppleButton />
      </View>
      <Button label="Não tem conta? Criar conta" variant="ghost" size="md" onPress={() => router.replace('/signup')} style={{ marginTop: SPACE.xl }} />
    </Screen>
  )
}
