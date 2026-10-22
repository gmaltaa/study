// app/reset-password.tsx — senha nova, depois do código de recuperação.
import { useState } from 'react'
import { Alert } from 'react-native'
import { Text } from '@/components/Text'
import { Screen } from '@/components/Screen'
import { TextField } from '@/components/Field'
import { Button } from '@/components/Button'
import { supabase } from '@/lib/supabase'
import { friendlyAuthError } from '@/lib/authError'
import { useAuth } from '@/lib/auth'
import { toast } from '@/lib/toast'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles } from '@/lib/theme'

export default function ResetPassword() {
  const s = useStyles()
  const { endRecovery, signOut } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (password.length < 6) return Alert.alert('Senha curta', 'Use pelo menos 6 caracteres.')
    if (password !== confirm) return Alert.alert('As senhas não batem', 'Digite a mesma senha nos dois campos.')
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Senha alterada')
      endRecovery()
    } catch (e: unknown) {
      Alert.alert('Não deu certo', friendlyAuthError((e as Error)?.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen surface="white">
      <Text style={s.title}>Crie uma senha nova</Text>
      <Text style={s.subtitle}>Use pelo menos 6 caracteres.</Text>
      <TextField label="Senha nova" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="password-new" />
      <TextField label="Repita a senha" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" autoComplete="password-new" />
      <Button label="Salvar senha" onPress={submit} loading={loading} disabled={!password || !confirm} style={{ marginTop: 8 }} />
      <Button label="Cancelar" variant="ghost" onPress={() => { endRecovery(); void signOut() }} style={{ marginTop: 8 }} />
    </Screen>
  )
}

const useStyles = makeThemedStyles((c) => ({
  title: { fontFamily: FONTS.extraBold, fontSize: 30, color: c.gray900, marginTop: 24, marginBottom: 6 },
  subtitle: { fontFamily: FONTS.medium, fontSize: 16, color: c.gray500, marginBottom: 28 },
}))
