// app/tema/novo.tsx — criar um tema em três passos: o que aprender, quanto
// tempo tem e como quer estudar. No fim, o backend recusa na hora um tema que
// não pode ser ensinado, ou começa a montar a trilha e a tela vai para ela.
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Text } from '@/components/Text'
import { Screen } from '@/components/Screen'
import { TextField } from '@/components/Field'
import { Button } from '@/components/Button'
import { Chip, ChipGroup, OptionCard } from '@/components/Chip'
import { StepDots } from '@/components/StepDots'
import { AvailabilityForm, DEFAULT_AVAILABILITY, availabilitySummary, type AvailabilityValue } from '@/components/AvailabilityForm'
import { api, ApiError, errorMessage } from '@/lib/api'
import { invalidateStudy } from '@/lib/query'
import { track } from '@/lib/analytics'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles } from '@/lib/theme'
import type { Depth, Level, Style } from '@/lib/types'

const SUGGESTIONS = ['História do Brasil', 'Finanças pessoais', 'Python', 'Inglês para viagem', 'Filosofia', 'Fotografia com celular']

const LEVELS: { value: Level; title: string; description: string }[] = [
  { value: 'beginner', title: 'Do zero', description: 'Nunca estudei esse assunto.' },
  { value: 'some_knowledge', title: 'Sei um pouco', description: 'Já vi o básico, mas tenho lacunas.' },
  { value: 'intermediate', title: 'Já tenho base', description: 'Quero ir além do básico.' },
]

const DEPTHS: { value: Depth; title: string; description: string }[] = [
  { value: 'intro', title: 'Visão geral', description: 'O essencial do assunto, em poucas horas.' },
  { value: 'solid', title: 'Base sólida', description: 'Do básico ao intermediário, bem completo.' },
  { value: 'deep', title: 'Aprofundado', description: 'Até o avançado. Leva mais tempo.' },
]

const STYLES: { value: Style; label: string }[] = [
  { value: 'theory', label: 'Mais teoria' },
  { value: 'balanced', label: 'Equilibrado' },
  { value: 'practice', label: 'Mais prática' },
]

export default function NewSubject() {
  const s = useStyles()
  const router = useRouter()
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>()
  const isOnboarding = onboarding === '1'
  const [step, setStep] = useState(0)
  const [title, setTitle] = useState('')
  const [goal, setGoal] = useState('')
  const [level, setLevel] = useState<Level>('beginner')
  const [availability, setAvailability] = useState<AvailabilityValue>(DEFAULT_AVAILABILITY)
  const [depth, setDepth] = useState<Depth>('solid')
  const [style, setStyle] = useState<Style>('balanced')
  const [creating, setCreating] = useState(false)

  const back = () => (step > 0 ? setStep(step - 1) : router.back())

  const create = async () => {
    setCreating(true)
    try {
      const { id } = await api.createSubject({
        title: title.trim(),
        goal: goal.trim() || null,
        level,
        depth,
        style,
        availability: {
          daysOfWeek: availability.daysOfWeek,
          dailyMinutes: availability.dailyMinutes,
          sessionsPerDay: availability.sessionsPerDay,
          deadline: availability.deadline,
          reminderTime: availability.reminderTime,
        },
      })
      track('subject_created', { depth, level, has_deadline: !!availability.deadline, onboarding: isOnboarding })
      invalidateStudy()
      router.replace({ pathname: '/tema/[id]', params: { id } })
    } catch (e) {
      if (e instanceof ApiError && e.code === 'topic_not_allowed') {
        Alert.alert('Esse tema não dá', e.message)
        setStep(0)
      } else {
        Alert.alert('Não deu certo', errorMessage(e))
      }
    } finally {
      setCreating(false)
    }
  }

  const steps = [
    {
      title: 'O que você quer aprender?',
      subtitle: 'Pode ser qualquer assunto. Quanto mais claro o objetivo, melhor a trilha.',
      body: (
        <>
          <TextField value={title} onChangeText={setTitle} placeholder="Ex.: História do Brasil" maxLength={120} autoFocus={!isOnboarding} />
          <View style={s.suggestions}>
            {SUGGESTIONS.map((x) => <Chip key={x} label={x} selected={title === x} onPress={() => setTitle(x)} />)}
          </View>
          <TextField
            label="Qual é o seu objetivo? (opcional)"
            value={goal}
            onChangeText={setGoal}
            placeholder="Ex.: entender a formação do país para o ENEM"
            multiline
            maxLength={600}
            style={{ marginTop: 20 }}
          />
          <Text style={s.section}>Quanto você já sabe?</Text>
          {LEVELS.map((l) => (
            <OptionCard key={l.value} title={l.title} description={l.description} selected={level === l.value} onPress={() => setLevel(l.value)} />
          ))}
        </>
      ),
      canNext: title.trim().length >= 2,
    },
    {
      title: 'Quanto tempo você tem?',
      subtitle: 'O cronograma é montado em cima disso e nunca passa do tempo que você informar.',
      body: <AvailabilityForm value={availability} onChange={setAvailability} />,
      canNext: true,
    },
    {
      title: 'Como você quer estudar?',
      subtitle: availabilitySummary(availability),
      body: (
        <>
          <Text style={s.section}>Até onde quer ir?</Text>
          {availability.deadline ? (
            <Text style={s.hint}>Com prazo, a trilha é montada para caber nele. A profundidade diz o que priorizar.</Text>
          ) : null}
          {DEPTHS.map((d) => (
            <OptionCard key={d.value} title={d.title} description={d.description} selected={depth === d.value} onPress={() => setDepth(d.value)} />
          ))}
          <Text style={s.section}>Estilo das aulas</Text>
          <ChipGroup options={STYLES} value={style} onChange={setStyle} />
        </>
      ),
      canNext: true,
    },
  ]
  const current = steps[step]
  const last = step === steps.length - 1

  return (
    <Screen
      back
      onBack={back}
      surface="white"
      footer={
        <Button
          label={last ? 'Montar minha trilha' : 'Continuar'}
          onPress={last ? create : () => setStep(step + 1)}
          disabled={!current.canNext}
          loading={creating}
        />
      }
    >
      <StepDots total={isOnboarding ? 4 : 3} current={isOnboarding ? step + 1 : step} />
      <Text style={s.title}>{current.title}</Text>
      <Text style={s.subtitle}>{current.subtitle}</Text>
      {current.body}
    </Screen>
  )
}

const useStyles = makeThemedStyles((c) => ({
  title: { fontFamily: FONTS.extraBold, fontSize: 28, lineHeight: 34, color: c.gray900, marginTop: 24, marginBottom: 8 },
  subtitle: { fontFamily: FONTS.regular, fontSize: 16, color: c.gray600, lineHeight: 23, marginBottom: 20 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -4 },
  section: { fontFamily: FONTS.bold, fontSize: 16, color: c.gray900, marginTop: 24, marginBottom: 12 },
  hint: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500, marginTop: -6, marginBottom: 12, lineHeight: 18 },
}))
