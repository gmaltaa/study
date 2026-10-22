// app/aula/[id].tsx — a aula: ler o conteúdo, fazer os exercícios (com a
// explicação de cada resposta) e concluir. `?sessionId=` liga a aula à sessão
// de hoje: concluir a última aula da sessão fecha a sessão.
import { useEffect, useRef, useState } from 'react'
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ActivityIndicator } from 'react-native'
import { Fire, Flag, X } from 'phosphor-react-native'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { TextField } from '@/components/Field'
import { BottomSheet } from '@/components/BottomSheet'
import { Confetti } from '@/components/Confetti'
import { LessonBlocks } from '@/components/LessonBlocks'
import { ExerciseCard } from '@/components/ExerciseCard'
import { ProgressBar } from '@/components/ProgressBar'
import { ErrorView, LoadingView } from '@/components/StateView'
import { api, errorMessage } from '@/lib/api'
import { invalidateStudy, keys } from '@/lib/query'
import { track } from '@/lib/analytics'
import { toast } from '@/lib/toast'
import { FONTS, GUTTER } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'
import type { CompleteResult, Lesson } from '@/lib/types'

type Phase = 'read' | 'exercises' | 'done'

export default function LessonScreen() {
  const s = useStyles()
  const c = useColors()
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

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.top}>
        <TouchableOpacity onPress={close} hitSlop={10}><X size={24} color={c.gray900} weight="bold" /></TouchableOpacity>
        <Text style={s.topTitle} numberOfLines={1}>{lesson ? `${lesson.subject.icon} ${lesson.subject.title}` : ''}</Text>
        <View style={{ width: 24 }} />
      </View>
      {query.isLoading ? (
        <LoadingView />
      ) : query.isError || !lesson ? (
        <ErrorView message={errorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : lesson.status === 'generating' ? (
        <Preparing lesson={lesson} />
      ) : lesson.status === 'quota' ? (
        <ErrorView message="Você atingiu o limite de aulas geradas hoje. Amanhã tem mais." />
      ) : (
        <Player lesson={lesson} sessionId={sessionId ?? null} />
      )}
    </SafeAreaView>
  )
}

function Preparing({ lesson }: { lesson: Lesson }) {
  const s = useStyles()
  const c = useColors()
  return (
    <View style={s.center}>
      <ActivityIndicator color={c.primary} size="large" />
      <Text style={s.prepTitle}>Preparando sua aula</Text>
      <Text style={s.prepText}>{lesson.title}</Text>
      <Text style={s.prepNote}>Leva uns 30 segundos. A partir de agora, as próximas aulas já ficam prontas antes.</Text>
    </View>
  )
}

function Player({ lesson, sessionId }: { lesson: Lesson; sessionId: string | null }) {
  const s = useStyles()
  const c = useColors()
  const router = useRouter()
  const scroller = useRef<ScrollView>(null)
  const [phase, setPhase] = useState<Phase>('read')
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<CompleteResult | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const exercises = lesson.exercises
  const exercise = exercises[index]

  useEffect(() => { track('lesson_started', { minutes: lesson.minutes, review: lesson.completed }) }, [lesson.id])
  useEffect(() => { scroller.current?.scrollTo({ y: 0, animated: false }) }, [phase, index])

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

  const nextExercise = () => {
    if (index < exercises.length - 1) setIndex(index + 1)
    else complete.mutate()
  }

  const goNext = () => {
    if (result?.nextInSession) {
      router.replace({ pathname: '/aula/[id]', params: { id: result.nextInSession, sessionId: sessionId ?? undefined } })
    } else {
      router.canGoBack() ? router.back() : router.replace('/')
    }
  }

  if (phase === 'done' && result) {
    const perfect = result.total > 0 && result.correct === result.total
    return (
      <View style={{ flex: 1 }}>
        {result.sessionCompleted || result.subjectCompleted ? <Confetti /> : null}
        <View style={s.center}>
          <Text style={s.doneEmoji}>{result.subjectCompleted ? '🏆' : perfect ? '🎯' : '✅'}</Text>
          <Text style={s.doneTitle}>
            {result.subjectCompleted ? 'Trilha concluída!' : result.sessionCompleted ? 'Sessão concluída!' : 'Aula concluída!'}
          </Text>
          {result.total > 0 ? (
            <Text style={s.doneText}>Você acertou {result.correct} de {result.total} {result.total === 1 ? 'questão' : 'questões'} de primeira.</Text>
          ) : null}
          {result.streak.current > 0 ? (
            <View style={s.streak}>
              <Fire size={22} color={c.accent} weight="fill" />
              <Text style={s.streakText}>{result.streak.current} {result.streak.current === 1 ? 'dia' : 'dias'} de estudo seguidos</Text>
            </View>
          ) : null}
        </View>
        <View style={s.footer}>
          <Button label={result.nextInSession ? 'Próxima aula' : 'Voltar'} onPress={goNext} />
          <Button label="Reportar um erro nesta aula" variant="ghostMuted" onPress={() => setReportOpen(true)} />
        </View>
        <ReportSheet visible={reportOpen} lessonId={lesson.id} onClose={() => setReportOpen(false)} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      {phase === 'exercises' ? (
        <View style={s.progress}>
          <ProgressBar percent={((index + (answers[exercise?.id] ? 1 : 0)) / Math.max(1, exercises.length)) * 100} />
          <Text style={s.progressText}>{index + 1} de {exercises.length}</Text>
        </View>
      ) : null}
      <ScrollView ref={scroller} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {phase === 'read' ? (
          <>
            <Text style={s.module}>Módulo {lesson.module.position} · {lesson.module.title}</Text>
            <Text style={s.title}>{lesson.title}</Text>
            <Text style={s.meta}>{lesson.minutes} min · {exercises.length} exercícios</Text>
            <View style={{ height: 20 }} />
            <LessonBlocks blocks={lesson.blocks} />
            {lesson.disclaimer ? <Text style={s.disclaimer}>{lesson.disclaimer}</Text> : null}
            <TouchableOpacity style={s.report} onPress={() => setReportOpen(true)}>
              <Flag size={16} color={c.gray500} weight="bold" />
              <Text style={s.reportText}>Encontrou um erro? Avise a gente</Text>
            </TouchableOpacity>
          </>
        ) : exercise ? (
          <ExerciseCard exercise={exercise} chosen={answers[exercise.id] ?? null} onChoose={choose} />
        ) : null}
      </ScrollView>
      <View style={s.footer}>
        {phase === 'read' ? (
          <Button
            label={exercises.length ? `Ir para os exercícios (${exercises.length})` : 'Concluir aula'}
            onPress={() => (exercises.length ? setPhase('exercises') : complete.mutate())}
            loading={complete.isPending}
          />
        ) : (
          <Button
            label={index < exercises.length - 1 ? 'Próxima questão' : 'Concluir aula'}
            onPress={nextExercise}
            disabled={!answers[exercise?.id]}
            loading={complete.isPending}
          />
        )}
      </View>
      <ReportSheet visible={reportOpen} lessonId={lesson.id} exerciseId={phase === 'exercises' ? exercise?.id : null} onClose={() => setReportOpen(false)} />
    </View>
  )
}

const REASONS = [
  { value: 'wrong_fact', label: 'Informação errada' },
  { value: 'wrong_answer', label: 'Gabarito errado' },
  { value: 'confusing', label: 'Confuso' },
  { value: 'other', label: 'Outro' },
] as const

function ReportSheet({ visible, lessonId, exerciseId, onClose }: {
  visible: boolean
  lessonId: string
  exerciseId?: string | null
  onClose: () => void
}) {
  const [reason, setReason] = useState<(typeof REASONS)[number]['value']>('wrong_fact')
  const [message, setMessage] = useState('')
  const send = useMutation({
    mutationFn: () => api.report({ lessonId, exerciseId: exerciseId ?? null, reason, message: message.trim() || null }),
    onSuccess: () => {
      track('content_reported', { reason })
      setMessage('')
      onClose()
      toast.success('Obrigado! Vamos revisar.')
    },
    onError: (e) => Alert.alert('Não deu certo', errorMessage(e)),
  })
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Reportar um erro" avoidKeyboard>
      <View style={{ paddingHorizontal: GUTTER, gap: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {REASONS.map((r) => <Chip key={r.value} label={r.label} selected={reason === r.value} onPress={() => setReason(r.value)} />)}
        </View>
        <TextField value={message} onChangeText={setMessage} placeholder="O que está errado? (opcional)" multiline maxLength={1000} />
        <Button label="Enviar" onPress={() => send.mutate()} loading={send.isPending} />
      </View>
    </BottomSheet>
  )
}

const useStyles = makeThemedStyles((c) => ({
  safe: { flex: 1, backgroundColor: c.white },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingVertical: 10 },
  topTitle: { flex: 1, textAlign: 'center', fontFamily: FONTS.semiBold, fontSize: 15, color: c.gray600 },
  progress: { paddingHorizontal: GUTTER, paddingBottom: 8, gap: 6 },
  progressText: { fontFamily: FONTS.semiBold, fontSize: 13, color: c.gray500, textAlign: 'right' },
  content: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 32 },
  module: { fontFamily: FONTS.semiBold, fontSize: 13, color: c.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontFamily: FONTS.extraBold, fontSize: 28, color: c.gray900, lineHeight: 34, marginTop: 8 },
  meta: { fontFamily: FONTS.regular, fontSize: 14, color: c.gray500, marginTop: 8 },
  disclaimer: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500, marginTop: 24, lineHeight: 19 },
  report: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24, alignSelf: 'center' },
  reportText: { fontFamily: FONTS.medium, fontSize: 14, color: c.gray500 },
  footer: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 8, gap: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  prepTitle: { fontFamily: FONTS.extraBold, fontSize: 22, color: c.gray900, marginTop: 16 },
  prepText: { fontFamily: FONTS.medium, fontSize: 16, color: c.gray700, textAlign: 'center' },
  prepNote: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500, textAlign: 'center', marginTop: 16, lineHeight: 19 },
  doneEmoji: { fontSize: 64 },
  doneTitle: { fontFamily: FONTS.extraBold, fontSize: 28, color: c.gray900, textAlign: 'center' },
  doneText: { fontFamily: FONTS.regular, fontSize: 16, color: c.gray600, textAlign: 'center', lineHeight: 23 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, backgroundColor: c.accentSoft, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  streakText: { fontFamily: FONTS.bold, fontSize: 15, color: c.gray900 },
}))
