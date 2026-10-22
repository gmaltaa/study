// components/GoogleButton.tsx — "Continuar com Google". Em sucesso, quem
// redireciona é o _layout (sessão nova → onboarding ou Hoje).
import { useState } from 'react'
import { Alert, Image } from 'react-native'
import { Button } from '@/components/ui/Button'
import { isGoogleConfigured, signInWithGoogle } from '@/lib/google-auth'

const GOOGLE_LOGO = require('../assets/images/logogoogle.png')

export function GoogleButton({ label = 'Continuar com Google' }: { label?: string }) {
  const [loading, setLoading] = useState(false)
  if (!isGoogleConfigured()) return null

  const onPress = async () => {
    setLoading(true)
    const res = await signInWithGoogle()
    setLoading(false)
    // O nome do Google chega ao perfil pelo trigger do banco (metadados da conta).
    if (res.ok || res.reason === 'cancelled') return
    if (res.reason === 'play_services') {
      Alert.alert('Google Play indisponível', 'Atualize o Google Play Services e tente de novo.')
      return
    }
    Alert.alert('Não deu certo', 'Não foi possível entrar com o Google. Tente de novo.')
  }

  return (
    <Button
      label={label}
      variant="secondary"
      loading={loading}
      onPress={onPress}
      icon={<Image source={GOOGLE_LOGO} style={{ width: 18, height: 18 }} resizeMode="contain" />}
    />
  )
}
