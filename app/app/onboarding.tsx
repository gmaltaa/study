// app/onboarding.tsx — primeiro passo depois do cadastro: o nome. Em seguida,
// a criação do primeiro tema (tema/novo?onboarding=1), que termina na prévia
// da trilha. O onboarding só é marcado como feito quando a trilha é aprovada,
// ou quando a pessoa escolhe criar o tema depois.
import { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Screen } from '@/components/ui/Screen'
import { PageHeader } from '@/components/ui/PageHeader'
import { TextField } from '@/components/ui/TextField'
import { Button } from '@/components/ui/Button'
import { StepProgress } from '@/components/ui/ProgressBar'
import { api, errorMessage } from '@/lib/api'
import { setProfileCache, useAuth } from '@/lib/auth'
import { track } from '@/lib/analytics'
import { ONBOARDING_STEPS } from '@/lib/onboarding'

export default function Onboarding() {
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
      setProfileCache(await api.updateMe({ displayName: name.trim() }))
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
      right={<Button label="Sair" variant="ghost" size="sm" onPress={() => void signOut()} />}
      footer={
        <>
          <Button label="Continuar" onPress={next} loading={saving} disabled={!name.trim()} />
          <Button label="Criar meu tema depois" variant="ghost" onPress={later} />
        </>
      }
    >
      <PageHeader
        title="Boas-vindas. Como podemos te chamar?"
        subtitle="Em seguida você conta o que quer aprender e quanto tempo tem. A gente monta o resto."
      >
        <StepProgress total={ONBOARDING_STEPS} current={0} />
      </PageHeader>
      <TextField value={name} onChangeText={setName} placeholder="Seu nome" autoCapitalize="words" autoComplete="name" maxLength={60} autoFocus />
    </Screen>
  )
}
