// app/reset-password.tsx — senha nova, depois do código de recuperação.
import { useState } from 'react'
import { Alert } from 'react-native'
import { Screen } from '@/components/ui/Screen'
import { PageHeader } from '@/components/ui/PageHeader'
import { TextField } from '@/components/ui/TextField'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { friendlyAuthError } from '@/lib/authError'
import { useAuth } from '@/lib/auth'
import { toast } from '@/lib/toast'
import { SPACE } from '@/lib/constants'

export default function ResetPassword() {
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
    <Screen>
      <PageHeader title="Crie uma senha nova" subtitle="Use pelo menos 6 caracteres." style={{ paddingTop: SPACE.xxl }} />
      <TextField label="Senha nova" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="password-new" />
      <TextField label="Repita a senha" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" autoComplete="password-new" />
      <Button label="Salvar senha" onPress={submit} loading={loading} disabled={!password || !confirm} style={{ marginTop: SPACE.sm }} />
      <Button label="Cancelar" variant="ghost" onPress={() => { endRecovery(); void signOut() }} />
    </Screen>
  )
}
