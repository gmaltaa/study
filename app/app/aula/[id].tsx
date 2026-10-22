// app/aula/[id].tsx — a aula: ler o conteúdo, fazer os exercícios (com a
// explicação de cada resposta) e concluir. `?sessionId=` liga a aula à sessão
// de hoje: concluir a última aula da sessão fecha a sessão.
import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { FireIcon, FlagIcon } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { ChipGroup } from '@/components/ui/Chip'
import { TextField } from '@/components/ui/TextField'
import { Sheet } from '@/components/ui/Sheet'
import { Tag } from '@/components/ui/Tag'
import { Confetti } from '@/components/ui/Confetti'
import { StepProgress } from '@/components/ui/ProgressBar'
import { ErrorView, LoadingView } from '@/components/ui/StateView'
import { LessonBlocks } from '@/components/LessonBlocks'
import { ExerciseCard } from '@/components/ExerciseCard'
import { MediaBlock, MediaExtras } from '@/components/media/MediaBlock'
import { api, errorMessage } from '@/lib/api'
import { invalidateStudy, keys } from '@/lib/query'
import { track } from '@/lib/analytics'
import { toast } from '@/lib/toast'
import { GUTTER, SPACE } from '@/lib/constants'
import { useColors } from '@/lib/theme'
import type { CompleteResult, Lesson } from '@/lib/types'

type Phase = 'read' | 'exercises' | 'done'

export default function LessonScreen() {
  const router = useRouter()
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId?: string }>()
  const query = useQuery({
    queryKey: keys.lesson(id),
    queryFn: () => api.lesson(id, sessionId),
    // Aula sendo gerada: consulta até ficar pronta.
    refetchInterval: (q) => (q.state.data?.status === 'generating' ? 4000 : false),
    staleTime: Infinity,
  })
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'))
  const lesson = query.data

  if (query.isLoading) return <Screen close onBack={close} scroll={false}><LoadingView /></Screen>
  if (query.isError || !lesson) {
    return <Screen close onBack={close} scroll={false}><ErrorView message={errorMessage(query.error)} onRetry={() => query.refetch()} /></Screen>
  }
  if (lesson.status === 'generating') return <Preparing lesson={lesson} onClose={close} />
  if (lesson.status === 'quota') {
    return (
      <Screen close onBack={close} title={lesson.subject.title} scroll={false}>
        <ErrorView message="Você atingiu o limite de aulas geradas hoje. Amanhã tem mais." />
      </Screen>
    )
  }
  return <Player lesson={lesson} sessionId={sessionId ?? null} onClose={close} />
}

function Preparing({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const c = useColors()
  return (
    <Screen close onBack={onClose} title={lesson.subject.title} scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center', gap: SPACE.md }}>
        <ActivityIndicator color={c.text} style={{ alignSelf: 'flex-start' }} />
        <Text variant="eyebrow" tone="secondary">Preparando sua aula</Text>
        <Text variant="title">{lesson.title}</Text>
        <Text variant="body" tone="secondary">
          Leva uns 30 segundos. Daqui para a frente, as próximas aulas ficam prontas antes.
        </Text>
      </View>
    </Screen>
  )
}

function Player({ lesson, sessionId, onClose }: { lesson: Lesson; sessionId: string | null; onClose: () => void }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('read')
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<CompleteResult | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const exercises = lesson.exercises
  const exercise = exercises[index]
  // Vídeo principal e imagens aparecem no meio do texto (blocos `media`); o
  // resto vai para o "Para ir além". `?? []`: backend anterior a esta versão.
  const media = lesson.media ?? []
  const mediaByRef = new Map(media.filter((m) => m.ref).map((m) => [m.ref!, m]))
  const extras = media.filter((m) => m.role === 'extra')
  const video = media.find((m) => m.role === 'core')

  useEffect(() => { track('lesson_started', { minutes: lesson.minutes, review: lesson.completed }) }, [lesson.id])

  const complete = useMutation({
    mutationFn: () => api.completeLesson(lesson.id, sessionId),
    onSuccess: (r) => {
      setResult(r)
      setPhase('done')
      invalidateStudy(lesson.subject.id)
      track('lesson_completed', { correct: r.correct, total: r.total })
      if (r.sessionCompleted) track('session_completed')
    },
    onError: (e) => Alert.alert('Não deu para salvar', errorMessage(e)),
  })

  const choose = (optionId: string) => {
    if (!exercise || answers[exercise.id]) return
    setAnswers({ ...answers, [exercise.id]: optionId })
    track('exercise_answered', { correct: optionId === exercise.correctOptionId })
    // Grava em segundo plano: a explicação já está na tela.
    api.answer(exercise.id, optionId, sessionId).catch(() => {})
  }

  const goNext = () => {
    if (result?.nextInSession) {
      router.replace({ pathname: '/aula/[id]', params: { id: result.nextInSession, sessionId: sessionId ?? undefined } })
    } else {
      onClose()
    }
  }

  const report = <ReportSheet visible={reportOpen} lessonId={lesson.id} exerciseId={phase === 'exercises' ? exercise?.id : null} onClose={() => setReportOpen(false)} />

  if (phase === 'done' && result) {
    const title = result.subjectCompleted ? 'Trilha concluída.' : result.sessionCompleted ? 'Sessão concluída.' : 'Aula concluída.'
    return (
      <View style={{ flex: 1 }}>
        <Screen
          close
          onBack={onClose}
          scroll={false}
          footer={
            <>
              <Button label={result.nextInSession ? 'Próxima aula' : 'Voltar'} onPress={goNext} />
              <Button label="Reportar um erro nesta aula" variant="ghost" onPress={() => setReportOpen(true)} />
            </>
          }
        >
          <View style={{ flex: 1, justifyContent: 'center', gap: SPACE.md }}>
            <Text variant="eyebrow" tone="secondary">{lesson.title}</Text>
            <Text variant="display">{title}</Text>
            {result.total > 0 ? (
              <Text variant="reading" tone="secondary">
                Você acertou {result.correct} de {result.total} {result.total === 1 ? 'questão' : 'questões'} de primeira.
              </Text>
            ) : null}
            {result.streak.current > 0 ? (
              <Tag
                label={`${result.streak.current} ${result.streak.current === 1 ? 'dia' : 'dias'} de estudo seguidos`}
                variant="accent"
                icon={<FireIcon />}
                style={{ marginTop: SPACE.sm }}
              />
            ) : null}
          </View>
        </Screen>
        {result.sessionCompleted || result.subjectCompleted ? <Confetti /> : null}
        {report}
      </View>
    )
  }

  if (phase === 'exercises' && exercise) {
    const last = index === exercises.length - 1
    return (
      <Screen
        key={`exercise-${index}`}
        close
        onBack={onClose}
        title={`Questão ${index + 1} de ${exercises.length}`}
        footer={
          <Button
            label={last ? 'Concluir aula' : 'Próxima questão'}
            onPress={() => (last ? complete.mutate() : setIndex(index + 1))}
            disabled={!answers[exercise.id]}
            loading={complete.isPending}
          />
        }
      >
        <View style={{ paddingTop: SPACE.sm, marginBottom: SPACE.xxl }}>
          <StepProgress total={exercises.length} current={index} />
        </View>
        <ExerciseCard exercise={exercise} chosen={answers[exercise.id] ?? null} onChoose={choose} />
        {report}
      </Screen>
    )
  }

  return (
    <Screen
      close
      onBack={onClose}
      title={lesson.subject.title}
      footer={
        <Button
          label={exercises.length ? `Ir para os exercícios (${exercises.length})` : 'Concluir aula'}
          onPress={() => (exercises.length ? setPhase('exercises') : complete.mutate())}
          loading={complete.isPending}
        />
      }
    >
      <View style={{ gap: SPACE.md, paddingTop: SPACE.lg, marginBottom: SPACE.xxl }}>
        <Text variant="eyebrow" tone="secondary">Módulo {lesson.module.position} · {lesson.module.title}</Text>
        <Text variant="title" accessibilityRole="header">{lesson.title}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
          <Tag label={`${lesson.minutes} min`} />
          {video ? <Tag label={`vídeo de ${video.countsMinutes} min`} /> : null}
          {exercises.length ? <Tag label={`${exercises.length} exercícios`} /> : null}
          {lesson.completed ? <Tag label="Já feita" variant="success" /> : null}
        </View>
      </View>
      <LessonBlocks
        blocks={lesson.blocks}
        renderMedia={(ref) => {
          const item = mediaByRef.get(ref)
          return item ? <MediaBlock item={item} /> : null
        }}
      />
      {lesson.disclaimer ? <Text variant="caption" tone="tertiary" style={{ marginTop: SPACE.xl }}>{lesson.disclaimer}</Text> : null}
      <MediaExtras items={extras} />
      <Button
        label="Encontrou um erro? Avise a gente"
        variant="ghost"
        size="sm"
        icon={<FlagIcon />}
        onPress={() => setReportOpen(true)}
        style={{ marginTop: SPACE.xxl, alignSelf: 'center' }}
      />
      {report}
    </Screen>
  )
}

const REASONS = [
  { value: 'wrong_fact', label: 'Informação errada' },
  { value: 'wrong_answer', label: 'Gabarito errado' },
  { value: 'confusing', label: 'Confuso' },
  { value: 'other', label: 'Outro' },
] as const

type Reason = (typeof REASONS)[number]['value']

function ReportSheet({ visible, lessonId, exerciseId, onClose }: {
  visible: boolean
  lessonId: string
  exerciseId?: string | null
  onClose: () => void
}) {
  const [reason, setReason] = useState<Reason>('wrong_fact')
  const [message, setMessage] = useState('')
  const send = useMutation({
    mutationFn: () => api.report({ lessonId, exerciseId: exerciseId ?? null, reason, message: message.trim() || null }),
    onSuccess: () => {
      track('content_reported', { reason })
      setMessage('')
      onClose()
      toast.success('Obrigado. Vamos revisar.')
    },
    onError: (e) => Alert.alert('Não deu certo', errorMessage(e)),
  })
  return (
    <Sheet visible={visible} onClose={onClose} title="Reportar um erro" avoidKeyboard>
      <View style={{ paddingHorizontal: GUTTER, gap: SPACE.lg }}>
        <ChipGroup options={[...REASONS]} value={reason} onChange={setReason} />
        <TextField value={message} onChangeText={setMessage} placeholder="O que está errado? (opcional)" multiline maxLength={1000} />
        <Button label="Enviar" onPress={() => send.mutate()} loading={send.isPending} />
      </View>
    </Sheet>
  )
}
