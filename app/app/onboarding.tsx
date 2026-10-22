// app/onboarding.tsx — primeiro passo depois do cadastro: o nome. Em seguida,
// a criação do primeiro tema (tema/novo?onboarding=1), que termina na prévia
// da trilha. O onboarding só é marcado como feito quando a trilha é aprovada,
// ou quando a pessoa escolhe criar o tema depois.
import { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Text } from '@/components/Text'
import { Screen } from '@/components/Screen'
import { TextField } from '@/components/Field'
import { Button } from '@/components/Button'
import { StepDots } from '@/components/StepDots'
import { api, errorMessage } from '@/lib/api'
import { setProfileCache, useAuth } from '@/lib/auth'
import { track } from '@/lib/analytics'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles } from '@/lib/theme'

export default function Onboarding() {
  const s = useStyles()
  const router = useRouter()
  const { profile, signOut } = useAuth()
  const [name, setName] = useState(profile?.displayName ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.displayName && !name) setName(profile.displayName)
  }, [profile?.displayName])

  const next = async () => {
    setSaving(true)
    try {
      const p = await api.updateMe({ displayName: name.trim() })
      setProfileCache(p)
      router.push({ pathname: '/tema/novo', params: { onboarding: '1' } })
    } catch (e) {
      Alert.alert('Não deu certo', errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const later = async () => {
    try {
      const p = await api.updateMe({ ...(name.trim() ? { displayName: name.trim() } : {}), onboarded: true })
      track('onboarding_completed', { skipped_subject: true })
      setProfileCache(p)
    } catch (e) {
      Alert.alert('Não deu certo', errorMessage(e))
    }
  }

  return (
    <Screen
      surface="white"
      right={<Text style={s.exit} onPress={() => void signOut()}>Sair</Text>}
      footer={
        <>
          <Button label="Continuar" onPress={next} loading={saving} disabled={!name.trim()} />
          <Button label="Criar meu tema depois" variant="ghostMuted" onPress={later} />
        </>
      }
    >
      <StepDots total={4} current={0} />
      <Text style={s.title}>Boas-vindas! Como podemos te chamar?</Text>
      <Text style={s.subtitle}>Em seguida, você conta o que quer aprender e quanto tempo tem. A gente monta o resto.</Text>
      <TextField value={name} onChangeText={setName} placeholder="Seu nome" autoCapitalize="words" autoComplete="name" maxLength={60} autoFocus />
    </Screen>
  )
}

const useStyles = makeThemedStyles((c) => ({
  title: { fontFamily: FONTS.extraBold, fontSize: 28, lineHeight: 34, color: c.gray900, marginTop: 24, marginBottom: 8 },
  subtitle: { fontFamily: FONTS.regular, fontSize: 16, color: c.gray600, lineHeight: 23, marginBottom: 28 },
  exit: { fontFamily: FONTS.semiBold, fontSize: 14, color: c.gray500 },
}))
