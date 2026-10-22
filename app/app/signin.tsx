// app/signin.tsx — entrar com e-mail e senha (ou Google/Apple).
import { useState } from 'react'
import { Alert, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Text } from '@/components/Text'
import { Screen } from '@/components/Screen'
import { TextField } from '@/components/Field'
import { Button } from '@/components/Button'
import { GoogleButton } from '@/components/GoogleButton'
import { AppleButton } from '@/components/AppleButton'
import { supabase } from '@/lib/supabase'
import { friendlyAuthError } from '@/lib/authError'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles } from '@/lib/theme'

export default function SignIn() {
  const s = useStyles()
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
    <Screen back surface="white">
      <Text style={s.title}>Entrar</Text>
      <Text style={s.subtitle}>Que bom te ver de novo.</Text>
      <TextField label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <TextField label="Senha" value={password} onChangeText={setPassword} placeholder="Sua senha" secureTextEntry autoCapitalize="none" autoComplete="password" />
      <TouchableOpacity style={s.forgot} onPress={() => router.push('/forgot-password')} hitSlop={8}>
        <Text style={s.link}>Esqueci a senha</Text>
      </TouchableOpacity>
      <Button label="Entrar" onPress={submit} loading={loading} disabled={!email.trim() || !password} style={{ marginTop: 8 }} />
      <View style={s.divider}><View style={s.line} /><Text style={s.or}>ou</Text><View style={s.line} /></View>
      <View style={{ gap: 10 }}>
        <GoogleButton label="Entrar com Google" />
        <AppleButton />
      </View>
      <TouchableOpacity style={s.switch} onPress={() => router.replace('/signup')}>
        <Text style={s.switchText}>Não tem conta? <Text style={s.link}>Criar conta</Text></Text>
      </TouchableOpacity>
    </Screen>
  )
}

const useStyles = makeThemedStyles((c) => ({
  title: { fontFamily: FONTS.extraBold, fontSize: 30, color: c.gray900, marginBottom: 6 },
  subtitle: { fontFamily: FONTS.medium, fontSize: 16, color: c.gray500, marginBottom: 28 },
  forgot: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 8 },
  link: { fontFamily: FONTS.bold, fontSize: 14, color: c.primary },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: c.gray200 },
  or: { fontFamily: FONTS.medium, fontSize: 13, color: c.gray500 },
  switch: { alignItems: 'center', marginTop: 24 },
  switchText: { fontFamily: FONTS.regular, fontSize: 14, color: c.gray500 },
}))
