// components/CodeForm.tsx — digitar o código de 6 dígitos enviado por e-mail,
// com reenvio após 60 s. Usado na confirmação de cadastro e na recuperação de senha.
import { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { Text, TextInput } from '@/components/Text'
import { Button } from '@/components/Button'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'

const RESEND_COOLDOWN = 60

export function CodeForm({ title, email, onVerify, onResend }: {
  title: string
  email: string
  onVerify: (code: string) => Promise<boolean>
  onResend: () => Promise<void>
}) {
  const s = useStyles()
  const c = useColors()
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
    <>
      <Text style={s.title}>{title}</Text>
      <Text style={s.desc}>Mandamos um código de 6 dígitos para {email}.</Text>
      <TextInput
        style={s.code}
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        placeholderTextColor={c.gray300}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        textAlign="center"
      />
      <Button label="Confirmar" onPress={verify} loading={verifying} disabled={code.length < 6} style={{ marginTop: 20 }} />
      <Button
        label={cooldown > 0 ? `Reenviar código em ${cooldown}s` : 'Reenviar código'}
        variant="ghost"
        onPress={resend}
        loading={resending}
        disabled={cooldown > 0}
        style={{ marginTop: 6 }}
      />
    </>
  )
}

const useStyles = makeThemedStyles((c) => ({
  title: { fontFamily: FONTS.extraBold, fontSize: 28, color: c.gray900, marginBottom: 8 },
  desc: { fontFamily: FONTS.regular, fontSize: 15, color: c.gray500, lineHeight: 22, marginBottom: 26 },
  code: {
    borderWidth: 1.5, borderColor: c.gray200, borderRadius: 16, backgroundColor: c.white,
    paddingVertical: 18, fontFamily: FONTS.extraBold, fontSize: 30, color: c.gray900, letterSpacing: 8,
  },
}))
