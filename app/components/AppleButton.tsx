// components/AppleButton.tsx — "Continuar com a Apple". Botão próprio, dentro
// das diretrizes da Apple (logo, texto aprovado, contraste). Só aparece no iOS.
import { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { AppleLogoIcon } from 'phosphor-react-native'
import { Button } from '@/components/ui/Button'
import { isAppleSignInAvailable, signInWithApple } from '@/lib/apple-auth'
import { api } from '@/lib/api'

export function AppleButton() {
  const [available, setAvailable] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { isAppleSignInAvailable().then(setAvailable) }, [])
  if (!available) return null

  const onPress = async () => {
    if (busy) return
    setBusy(true)
    const res = await signInWithApple()
    setBusy(false)
    if (!res.ok) {
      if (res.reason !== 'cancelled') Alert.alert('Não deu certo', 'Não foi possível entrar com a Apple. Tente de novo.')
      return
    }
    // A Apple só manda o nome na primeira autorização: é a única chance de salvar.
    if (res.fullName) api.updateMe({ displayName: res.fullName.slice(0, 60) }).catch(() => {})
  }

  return (
    <Button
      label="Continuar com a Apple"
      variant="secondary"
      loading={busy}
      onPress={onPress}
      icon={<AppleLogoIcon />}
    />
  )
}
