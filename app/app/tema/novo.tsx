// app/tema/novo.tsx — criar um tema em quatro passos:
//   1. o que aprender (o campo grande, como um pedido)
//   2. o objetivo e o quanto já sabe
//   3. quanto tempo tem
//   4. até onde ir e como estudar
// No fim, o backend recusa na hora um tema que não pode ser ensinado, ou começa
// a montar a trilha e a tela vai para ela.
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Screen } from '@/components/ui/Screen'
import { PageHeader } from '@/components/ui/PageHeader'
import { Composer } from '@/components/ui/Composer'
import { TextField } from '@/components/ui/TextField'
import { Button } from '@/components/ui/Button'
import { ListRow } from '@/components/ui/ListRow'
import { ChipGroup, RadioCard } from '@/components/ui/Chip'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { StepProgress } from '@/components/ui/ProgressBar'
import { AvailabilityForm, DEFAULT_AVAILABILITY, availabilitySummary, type AvailabilityValue } from '@/components/AvailabilityForm'
import { api, ApiError, errorMessage } from '@/lib/api'
import { invalidateStudy } from '@/lib/query'
import { track } from '@/lib/analytics'
import { ONBOARDING_STEPS } from '@/lib/onboarding'
import { SPACE } from '@/lib/constants'
import type { Depth, Level, Style } from '@/lib/types'

const SUGGESTIONS = [
  'História do Brasil',
  'Finanças pessoais',
  'Python do zero',
  'Inglês para viagem',
  'Filosofia antiga',
  'Fotografia com o celular',
]

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

const LAST_STEP = 3

export default function NewSubject() {
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
  const next = () => setStep(Math.min(LAST_STEP, step + 1))

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

  const progress = <StepProgress total={isOnboarding ? ONBOARDING_STEPS : LAST_STEP + 1} current={isOnboarding ? step + 1 : step} />

  if (step === 0) {
    return (
      <Screen back onBack={back}>
        <PageHeader title="O que você quer aprender?" subtitle="Pode ser qualquer assunto. Escreva do seu jeito.">
          {progress}
        </PageHeader>
        <Composer
          value={title}
          onChangeText={setTitle}
          placeholder="Ex.: história do Brasil"
          onSubmit={next}
          maxLength={120}
          autoFocus={!isOnboarding}
        />
        <SectionHeader title="Ou comece por um destes" />
        {SUGGESTIONS.map((x) => (
          <ListRow key={x} variant="divided" title={x} onPress={() => { setTitle(x); next() }} chevron />
        ))}
      </Screen>
    )
  }

  const steps = {
    1: {
      title: 'Qual é o seu objetivo?',
      subtitle: `Sobre ${title.trim()}. Quanto mais claro o objetivo, melhor a trilha.`,
      body: (
        <>
          <TextField
            value={goal}
            onChangeText={setGoal}
            placeholder="Ex.: entender a formação do país para o ENEM"
            multiline
            maxLength={600}
            hint="Opcional"
          />
          <SectionHeader title="Quanto você já sabe?" style={{ marginTop: SPACE.lg }} />
          {LEVELS.map((l) => (
            <RadioCard key={l.value} title={l.title} description={l.description} selected={level === l.value} onPress={() => setLevel(l.value)} />
          ))}
        </>
      ),
    },
    2: {
      title: 'Quanto tempo você tem?',
      subtitle: 'O cronograma é montado em cima disso e nunca passa do tempo que você informar.',
      body: <AvailabilityForm value={availability} onChange={setAvailability} />,
    },
    3: {
      title: 'Como você quer estudar?',
      subtitle: availabilitySummary(availability),
      body: (
        <>
          <SectionHeader
            title="Até onde quer ir?"
            description={availability.deadline ? 'Com prazo, a trilha cabe nele. A profundidade diz o que priorizar.' : null}
            style={{ marginTop: 0 }}
          />
          {DEPTHS.map((d) => (
            <RadioCard key={d.value} title={d.title} description={d.description} selected={depth === d.value} onPress={() => setDepth(d.value)} />
          ))}
          <SectionHeader title="Estilo das aulas" />
          <ChipGroup options={STYLES} value={style} onChange={setStyle} />
        </>
      ),
    },
  }[step as 1 | 2 | 3]

  return (
    <Screen
      back
      onBack={back}
      footer={
        step === LAST_STEP
          ? <Button label="Montar minha trilha" onPress={create} loading={creating} />
          : <Button label="Continuar" onPress={next} />
      }
    >
      <PageHeader title={steps.title} subtitle={steps.subtitle}>{progress}</PageHeader>
      <View>{steps.body}</View>
    </Screen>
  )
}
