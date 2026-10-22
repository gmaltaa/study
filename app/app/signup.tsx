// app/signup.tsx — criar conta com e-mail e senha (ou Google/Apple).
import { useState } from 'react'
import { Alert, Linking, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Text } from '@/components/Text'
import { Screen } from '@/components/Screen'
import { TextField } from '@/components/Field'
import { Button } from '@/components/Button'
import { GoogleButton } from '@/components/GoogleButton'
import { AppleButton } from '@/components/AppleButton'
import { supabase } from '@/lib/supabase'
import { friendlyAuthError } from '@/lib/authError'
import { track } from '@/lib/analytics'
import { FONTS, SITE_URL } from '@/lib/constants'
import { makeThemedStyles } from '@/lib/theme'

export default function SignUp() {
  const s = useStyles()
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
    <Screen back surface="white">
      <Text style={s.title}>Criar conta</Text>
      <Text style={s.subtitle}>Leva um minuto. Depois, a gente monta sua primeira trilha.</Text>
      <TextField label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <TextField label="Senha" value={password} onChangeText={setPassword} placeholder="Pelo menos 6 caracteres" secureTextEntry autoCapitalize="none" autoComplete="password-new" />
      <Button label="Criar conta" onPress={submit} loading={loading} disabled={!email.trim() || !password} style={{ marginTop: 8 }} />
      <View style={s.divider}><View style={s.line} /><Text style={s.or}>ou</Text><View style={s.line} /></View>
      <View style={{ gap: 10 }}>
        <GoogleButton />
        <AppleButton />
      </View>
      <TouchableOpacity style={s.switch} onPress={() => router.replace('/signin')}>
        <Text style={s.switchText}>Já tem conta? <Text style={s.link}>Entrar</Text></Text>
      </TouchableOpacity>
      {SITE_URL ? (
        <Text style={s.legal}>
          Ao continuar, você concorda com os{' '}
          <Text style={s.legalLink} onPress={() => Linking.openURL(`${SITE_URL}/termos`)}>Termos de uso</Text> e a{' '}
          <Text style={s.legalLink} onPress={() => Linking.openURL(`${SITE_URL}/privacidade`)}>Política de privacidade</Text>.
        </Text>
      ) : null}
    </Screen>
  )
}

const useStyles = makeThemedStyles((c) => ({
  title: { fontFamily: FONTS.extraBold, fontSize: 30, color: c.gray900, marginBottom: 6 },
  subtitle: { fontFamily: FONTS.medium, fontSize: 16, color: c.gray500, lineHeight: 22, marginBottom: 28 },
  link: { fontFamily: FONTS.bold, fontSize: 14, color: c.primary },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: c.gray200 },
  or: { fontFamily: FONTS.medium, fontSize: 13, color: c.gray500 },
  switch: { alignItems: 'center', marginTop: 24 },
  switchText: { fontFamily: FONTS.regular, fontSize: 14, color: c.gray500 },
  legal: { fontFamily: FONTS.regular, fontSize: 12, color: c.gray500, textAlign: 'center', lineHeight: 18, marginTop: 28 },
  legalLink: { fontFamily: FONTS.semiBold, color: c.primary },
}))
