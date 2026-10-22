// components/CodeForm.tsx — o código de 6 dígitos enviado por e-mail, com
// reenvio após 60 s. Confirmação de cadastro e recuperação de senha.
import { useEffect, useState } from 'react'
import { Alert, View } from 'react-native'
import { Text, TextInput } from '@/components/ui/Text'
import { Button } from '@/components/ui/Button'
import { HAIRLINE, RADIUS, SPACE } from '@/lib/constants'
import { makeThemedStyles } from '@/lib/theme'

const RESEND_COOLDOWN = 60

export function CodeForm({ title, email, onVerify, onResend }: {
  title: string
  email: string
  onVerify: (code: string) => Promise<boolean>
  onResend: () => Promise<void>
}) {
  const s = useStyles()
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((v) => v - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const verify = async () => {
    setVerifying(true)
    const ok = await onVerify(code.trim())
    setVerifying(false)
    if (!ok) Alert.alert('Código inválido', 'Confira o código ou peça outro.')
  }

  const resend = async () => {
    setResending(true)
    try {
      await onResend()
      setCooldown(RESEND_COOLDOWN)
      Alert.alert('Código reenviado', 'Confira sua caixa de entrada e o spam.')
    } catch {
      Alert.alert('Não deu certo', 'Tente de novo em instantes.')
    } finally {
      setResending(false)
    }
  }

  return (
    <View style={{ gap: SPACE.sm }}>
      <Text variant="title">{title}</Text>
      <Text variant="body" tone="secondary" style={{ marginBottom: SPACE.xl }}>
        Mandamos um código de 6 dígitos para {email}.
      </Text>
      <TextInput
        variant="title"
        style={s.code}
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
        textAlign="center"
      />
      <Button label="Confirmar" onPress={verify} loading={verifying} disabled={code.length < 6} style={{ marginTop: SPACE.lg }} />
      <Button
        label={cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
        variant="ghost"
        onPress={resend}
        loading={resending}
        disabled={cooldown > 0}
      />
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  code: {
    height: 68, borderRadius: RADIUS.lg, borderWidth: HAIRLINE, borderColor: c.borderStrong,
    backgroundColor: c.surface, letterSpacing: 10,
  },
}))
