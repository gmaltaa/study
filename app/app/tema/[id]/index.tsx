// app/tema/[id]/index.tsx — o tema. A tela muda com o estado dele:
//   generating → a trilha está sendo montada (consulta a cada 3 s)
//   failed     → deu errado, tentar de novo
//   review     → prévia da trilha: começar ou pedir ajuste
//   active / paused / completed → progresso, próximas sessões e a trilha
import { useState } from 'react'
import { ActivityIndicator, Alert, RefreshControl, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Archive, CalendarBlank, Clock, Pause, PencilSimple, Play, Trash, Warning } from 'phosphor-react-native'
import { Text } from '@/components/Text'
import { Screen } from '@/components/Screen'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { ProgressBar } from '@/components/ProgressBar'
import { ModuleList } from '@/components/ModuleList'
import { SubjectIcon } from '@/components/SubjectIcon'
import { TextField } from '@/components/Field'
import { BottomSheet } from '@/components/BottomSheet'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { ErrorView, LoadingView } from '@/components/StateView'
import { api, ApiError, errorMessage } from '@/lib/api'
import { invalidateStudy, keys, queryClient } from '@/lib/query'
import { setProfileCache, useAuth } from '@/lib/auth'
import { track } from '@/lib/analytics'
import { toast } from '@/lib/toast'
import { FONTS, GUTTER } from '@/lib/constants'
import { formatDate, formatDays, formatHours, formatMinutes, relativeDay, toISODate } from '@/lib/format'
import { makeThemedStyles, useColors } from '@/lib/theme'
import type { SubjectDetail } from '@/lib/types'

export default function SubjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const query = useQuery({
    queryKey: keys.subject(id),
    queryFn: () => api.subject(id),
    refetchInterval: (q) => (q.state.data?.status === 'generating' ? 3000 : false),
  })

  if (query.isLoading) return <Screen back scroll={false}><LoadingView /></Screen>
  if (query.isError || !query.data) {
    return <Screen back scroll={false}><ErrorView message={errorMessage(query.error)} onRetry={() => query.refetch()} /></Screen>
  }
  const subject = query.data
  if (subject.status === 'generating') return <Generating subject={subject} />
  if (subject.status === 'failed') return <Failed subject={subject} />
  if (subject.status === 'review') return <Review subject={subject} />
  return <Detail subject={subject} refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
}

function setSubject(data: SubjectDetail) {
  queryClient.setQueryData(keys.subject(data.id), data)
  invalidateStudy()
}

// ─── Gerando ───────────────────────────────────────────────────────────────

const GENERATING_STEPS = [
  'Dividindo o assunto em módulos',
  'Ordenando do básico ao avançado',
  'Separando as aulas de cada módulo',
  'Encaixando tudo no seu tempo',
]

function Generating({ subject }: { subject: SubjectDetail }) {
  const s = useStyles()
  const c = useColors()
  const router = useRouter()
  const { profile } = useAuth()
  const adjusting = !!subject.path?.adjustmentRequest
  return (
    <Screen back={!!profile?.onboardedAt} onBack={() => router.replace('/')} scroll={false}>
      <View style={s.center}>
        <SubjectIcon icon={subject.icon} color={subject.color} size={72} />
        <Text style={s.bigTitle}>{adjusting ? 'Ajustando sua trilha' : 'Montando sua trilha'}</Text>
        <Text style={s.centerText}>{subject.title}</Text>
        <ActivityIndicator color={c.primary} size="large" style={{ marginVertical: 24 }} />
        {GENERATING_STEPS.map((step) => <Text key={step} style={s.step}>{step}</Text>)}
        <Text style={s.note}>Leva até 2 minutos. Pode sair desta tela: a trilha fica pronta em Temas.</Text>
      </View>
    </Screen>
  )
}

// ─── Falhou ────────────────────────────────────────────────────────────────

function Failed({ subject }: { subject: SubjectDetail }) {
  const s = useStyles()
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const retry = useMutation({
    mutationFn: () => api.retryPath(subject.id),
    onSuccess: setSubject,
    onError: (e) => Alert.alert('Não deu certo', errorMessage(e)),
  })
  const remove = useMutation({
    mutationFn: () => api.deleteSubject(subject.id),
    onSuccess: () => { invalidateStudy(); router.replace('/') },
  })
  return (
    <Screen back scroll={false} footer={
      <>
        <Button label="Tentar de novo" onPress={() => retry.mutate()} loading={retry.isPending} />
        <Button label="Excluir tema" variant="ghostDanger" onPress={() => setConfirmDelete(true)} />
      </>
    }>
      <View style={s.center}>
        <SubjectIcon icon={subject.icon} color={subject.color} size={72} />
        <Text style={s.bigTitle}>Não conseguimos montar a trilha</Text>
        <Text style={s.centerText}>{subject.failureReason ?? 'Algo deu errado do nosso lado. Tente de novo.'}</Text>
      </View>
      <ConfirmSheet
        visible={confirmDelete}
        title="Excluir este tema?"
        message="O tema e a trilha somem de vez."
        confirmLabel="Excluir"
        destructive
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onClose={() => setConfirmDelete(false)}
      />
    </Screen>
  )
}

// ─── Prévia da trilha ──────────────────────────────────────────────────────

function Review({ subject }: { subject: SubjectDetail }) {
  const s = useStyles()
  const c = useColors()
  const router = useRouter()
  const { profile } = useAuth()
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustText, setAdjustText] = useState('')
  const modules = subject.path?.modules ?? []
  const lessons = modules.reduce((n, m) => n + m.lessons.length, 0)
  const total = subject.path?.totalMinutes ?? subject.progress.minutesTotal

  const approve = useMutation({
    mutationFn: async () => {
      const data = await api.approvePath(subject.id)
      if (!profile?.onboardedAt) {
        setProfileCache(await api.updateMe({ onboarded: true }))
        track('onboarding_completed', { skipped_subject: false })
      }
      return data
    },
    onSuccess: (data) => {
      track('path_approved', { modules: modules.length, lessons })
      setSubject(data)
      toast.success('Trilha pronta! Sua primeira aula está em Hoje.')
      router.replace('/')
    },
    onError: (e) => Alert.alert('Não deu certo', errorMessage(e)),
  })

  const adjust = useMutation({
    mutationFn: () => api.adjustPath(subject.id, adjustText.trim()),
    onSuccess: (data) => {
      track('path_adjusted')
      setAdjustOpen(false)
      setAdjustText('')
      setSubject(data)
    },
    onError: (e) => Alert.alert('Não deu certo', errorMessage(e)),
  })

  return (
    <Screen
      back={!!profile?.onboardedAt}
      onBack={() => router.replace('/')}
      footer={
        <>
          <Button label="Começar a estudar" onPress={() => approve.mutate()} loading={approve.isPending} />
          <Button label="Pedir um ajuste" variant="ghost" onPress={() => setAdjustOpen(true)} />
        </>
      }
    >
      <View style={s.hero}>
        <SubjectIcon icon={subject.icon} color={subject.color} size={56} />
        <Text style={s.eyebrow}>Sua trilha está pronta</Text>
        <Text style={s.heroTitle}>{subject.title}</Text>
      </View>
      {subject.failureReason ? (
        <View style={s.warn}>
          <Warning size={18} color={c.yellow} weight="fill" />
          <Text style={s.warnText}>{subject.failureReason}</Text>
        </View>
      ) : null}
      <View style={s.stats}>
        <Stat value={String(modules.length)} label="módulos" />
        <Stat value={String(lessons)} label="aulas" />
        <Stat value={formatHours(total)} label="de estudo" />
      </View>
      {subject.endDate ? (
        <Card style={s.endCard}>
          <CalendarBlank size={20} color={c.primary} weight="bold" />
          <Text style={s.endText}>
            No seu ritmo, você termina em <Text style={s.bold}>{formatDate(subject.endDate)}</Text>.
            {subject.availability ? ` ${formatDays(subject.availability.daysOfWeek)}, ${subject.availability.dailyMinutes} min por dia.` : ''}
          </Text>
        </Card>
      ) : null}
      {!subject.fitsDeadline && subject.deadline ? (
        <View style={s.warn}>
          <Warning size={18} color={c.yellow} weight="fill" />
          <Text style={s.warnText}>Passa do seu prazo ({formatDate(subject.deadline)}). Peça um ajuste ou aumente o tempo por dia.</Text>
        </View>
      ) : null}
      <Text style={s.section}>Do básico ao avançado</Text>
      <ModuleList modules={modules} />
      {subject.disclaimer ? <Text style={s.disclaimer}>{subject.disclaimer}</Text> : null}

      <BottomSheet visible={adjustOpen} onClose={() => setAdjustOpen(false)} title="O que mudar na trilha?" avoidKeyboard>
        <View style={{ paddingHorizontal: GUTTER }}>
          <TextField
            value={adjustText}
            onChangeText={setAdjustText}
            placeholder="Ex.: menos Império e mais República; incluir exercícios de redação"
            multiline
            maxLength={600}
            autoFocus
          />
          <Button label="Refazer trilha" onPress={() => adjust.mutate()} loading={adjust.isPending} disabled={adjustText.trim().length < 3} />
        </View>
      </BottomSheet>
    </Screen>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  const s = useStyles()
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

// ─── Tema ativo ────────────────────────────────────────────────────────────

function Detail({ subject, refreshing, onRefresh }: { subject: SubjectDetail; refreshing: boolean; onRefresh: () => void }) {
  const s = useStyles()
  const c = useColors()
  const router = useRouter()
  const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null)
  const today = toISODate(new Date())
  const paused = subject.status === 'paused'
  const completed = subject.status === 'completed'

  const toggle = useMutation({
    mutationFn: () => api.updateSubject(subject.id, { status: paused ? 'active' : 'paused' }),
    onSuccess: (data) => { setSubject(data); toast.success(paused ? 'Tema retomado' : 'Tema pausado') },
    onError: (e) => Alert.alert('Não deu certo', errorMessage(e)),
  })
  const archive = useMutation({
    mutationFn: () => api.updateSubject(subject.id, { archived: true }),
    onSuccess: () => { invalidateStudy(subject.id); router.replace('/temas') },
  })
  const remove = useMutation({
    mutationFn: () => api.deleteSubject(subject.id),
    onSuccess: () => { invalidateStudy(); router.replace('/temas') },
  })
  const extra = useMutation({
    mutationFn: () => api.extraSession(subject.id),
    onSuccess: ({ sessionId, lessonId }) => {
      invalidateStudy(subject.id)
      router.push({ pathname: '/aula/[id]', params: { id: lessonId, sessionId } })
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'today_pending') router.replace('/')
      else Alert.alert('Não deu certo', errorMessage(e))
    },
  })

  return (
    <Screen back refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}>
      <View style={s.hero}>
        <SubjectIcon icon={subject.icon} color={subject.color} size={56} />
        <Text style={s.heroTitle}>{subject.title}</Text>
        {paused ? <Text style={s.badge}>Pausado</Text> : completed ? <Text style={[s.badge, s.badgeDone]}>Concluído</Text> : null}
      </View>

      <Card>
        <View style={s.progressRow}>
          <Text style={s.progressPercent}>{subject.progress.percent}%</Text>
          <Text style={s.progressMeta}>
            {subject.progress.completed} de {subject.progress.total} aulas · {formatMinutes(subject.progress.minutesDone)} de {formatHours(subject.progress.minutesTotal)}
          </Text>
        </View>
        <ProgressBar percent={subject.progress.percent} />
        {subject.endDate && !completed ? (
          <Text style={s.progressEnd}>Termina em {formatDate(subject.endDate)}</Text>
        ) : null}
        {!subject.fitsDeadline && subject.deadline && !completed ? (
          <View style={[s.warn, { marginTop: 12, marginBottom: 0 }]}>
            <Warning size={18} color={c.yellow} weight="fill" />
            <Text style={s.warnText}>No ritmo atual, passa do prazo ({formatDate(subject.deadline)}). Aumente o tempo por dia para recuperar.</Text>
          </View>
        ) : null}
      </Card>

      {subject.nextLesson && !paused && !completed ? (
        <Card style={{ marginTop: 12 }}>
          <Text style={s.cardLabel}>Próxima aula</Text>
          <Text style={s.cardTitle}>{subject.nextLesson.title}</Text>
          {subject.nextSessionDate === today ? (
            <Button label="Ir para a aula de hoje" onPress={() => router.replace('/')} style={{ marginTop: 14 }} />
          ) : (
            <>
              {subject.nextSessionDate ? <Text style={s.cardMeta}>Marcada para {relativeDay(subject.nextSessionDate, today)}</Text> : null}
              <Button label="Adiantar agora" variant="secondary" onPress={() => extra.mutate()} loading={extra.isPending} style={{ marginTop: 14 }} />
            </>
          )}
        </Card>
      ) : null}

      {subject.upcoming.length > 0 && !paused ? (
        <>
          <Text style={s.section}>Próximas sessões</Text>
          <Card>
            {subject.upcoming.slice(0, 5).map((x, i) => (
              <View key={`${x.date}-${x.slot}`} style={[s.upcoming, i > 0 && s.upcomingBorder]}>
                <Text style={s.upcomingDay}>{relativeDay(x.date, today)}</Text>
                <View style={{ flex: 1 }}>
                  {x.lessons.map((l) => <Text key={l.id} style={s.upcomingLesson} numberOfLines={2}>{l.title}</Text>)}
                </View>
                <Text style={s.upcomingMin}>{x.lessons.reduce((n, l) => n + l.minutes, 0)} min</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <Text style={s.section}>Trilha</Text>
      <ModuleList
        modules={subject.path?.modules ?? []}
        showProgress
        onLessonPress={(lessonId) => router.push({ pathname: '/aula/[id]', params: { id: lessonId } })}
      />

      {subject.availability ? (
        <>
          <Text style={s.section}>Sua disponibilidade</Text>
          <Card onPress={() => router.push({ pathname: '/tema/[id]/disponibilidade', params: { id: subject.id } })}>
            <View style={s.availRow}>
              <Clock size={20} color={c.gray700} weight="bold" />
              <View style={{ flex: 1 }}>
                <Text style={s.availText}>
                  {formatDays(subject.availability.daysOfWeek)}, {subject.availability.dailyMinutes} min por dia
                  {subject.availability.sessionsPerDay > 1 ? ` em ${subject.availability.sessionsPerDay} sessões` : ''}
                </Text>
                <Text style={s.availMeta}>
                  {subject.availability.deadline ? `Prazo: ${formatDate(subject.availability.deadline)}` : 'Sem prazo'}
                  {subject.availability.reminderTime ? ` · Lembrete às ${subject.availability.reminderTime}` : ''}
                </Text>
              </View>
              <PencilSimple size={20} color={c.primary} weight="bold" />
            </View>
          </Card>
        </>
      ) : null}

      {subject.disclaimer ? <Text style={s.disclaimer}>{subject.disclaimer}</Text> : null}

      <View style={s.actions}>
        {!completed ? (
          <Button
            label={paused ? 'Retomar tema' : 'Pausar tema'}
            variant="secondary"
            icon={paused ? <Play size={18} weight="bold" /> : <Pause size={18} weight="bold" />}
            onPress={() => toggle.mutate()}
            loading={toggle.isPending}
          />
        ) : null}
        <Button label="Arquivar" variant="ghost" icon={<Archive size={18} color={c.gray900} weight="bold" />} onPress={() => setConfirm('archive')} />
        <Button label="Excluir tema" variant="ghostDanger" icon={<Trash size={18} color={c.red} weight="bold" />} onPress={() => setConfirm('delete')} />
      </View>

      <ConfirmSheet
        visible={confirm === 'archive'}
        title="Arquivar este tema?"
        message="Ele sai de Hoje e da lista de temas, e libera espaço para um tema novo. O progresso fica guardado."
        confirmLabel="Arquivar"
        loading={archive.isPending}
        onConfirm={() => archive.mutate()}
        onClose={() => setConfirm(null)}
      />
      <ConfirmSheet
        visible={confirm === 'delete'}
        title="Excluir este tema?"
        message="A trilha, as aulas e todo o progresso deste tema somem de vez. Não dá para desfazer."
        confirmLabel="Excluir"
        destructive
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onClose={() => setConfirm(null)}
      />
    </Screen>
  )
}

const useStyles = makeThemedStyles((c) => ({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  bigTitle: { fontFamily: FONTS.extraBold, fontSize: 24, color: c.gray900, textAlign: 'center', marginTop: 20 },
  centerText: { fontFamily: FONTS.regular, fontSize: 16, color: c.gray600, textAlign: 'center', marginTop: 8, lineHeight: 23 },
  step: { fontFamily: FONTS.medium, fontSize: 15, color: c.gray600, marginTop: 6 },
  note: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500, textAlign: 'center', marginTop: 28, lineHeight: 19 },

  hero: { alignItems: 'center', paddingTop: 8, paddingBottom: 20 },
  eyebrow: { fontFamily: FONTS.semiBold, fontSize: 13, color: c.primary, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.6 },
  heroTitle: { fontFamily: FONTS.extraBold, fontSize: 26, color: c.gray900, textAlign: 'center', marginTop: 6, lineHeight: 32 },
  badge: {
    fontFamily: FONTS.bold, fontSize: 12, color: c.gray700, backgroundColor: c.gray100,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginTop: 8, overflow: 'hidden',
  },
  badgeDone: { color: c.green, backgroundColor: c.greenLight },

  stats: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: c.white, borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: c.gray100 },
  statValue: { fontFamily: FONTS.extraBold, fontSize: 22, color: c.gray900 },
  statLabel: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500, marginTop: 2 },
  endCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  endText: { flex: 1, fontFamily: FONTS.regular, fontSize: 15, color: c.gray700, lineHeight: 21 },
  bold: { fontFamily: FONTS.bold, color: c.gray900 },

  warn: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: c.yellowLight,
    borderRadius: 14, padding: 12, marginBottom: 12,
  },
  warnText: { flex: 1, fontFamily: FONTS.medium, fontSize: 14, color: c.gray700, lineHeight: 20 },

  section: { fontFamily: FONTS.bold, fontSize: 18, color: c.gray900, marginTop: 28, marginBottom: 12 },
  disclaimer: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500, marginTop: 20, lineHeight: 19, textAlign: 'center' },

  progressRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 10 },
  progressPercent: { fontFamily: FONTS.extraBold, fontSize: 28, color: c.gray900 },
  progressMeta: { flex: 1, fontFamily: FONTS.regular, fontSize: 14, color: c.gray600 },
  progressEnd: { fontFamily: FONTS.medium, fontSize: 14, color: c.gray600, marginTop: 10 },

  cardLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: c.gray500, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 18, color: c.gray900, marginTop: 6, lineHeight: 24 },
  cardMeta: { fontFamily: FONTS.regular, fontSize: 14, color: c.gray600, marginTop: 4 },

  upcoming: { flexDirection: 'row', gap: 12, paddingVertical: 10, alignItems: 'flex-start' },
  upcomingBorder: { borderTopWidth: 1, borderTopColor: c.gray100 },
  upcomingDay: { width: 72, fontFamily: FONTS.bold, fontSize: 14, color: c.gray900, textTransform: 'capitalize' },
  upcomingLesson: { fontFamily: FONTS.regular, fontSize: 14, color: c.gray700, lineHeight: 20 },
  upcomingMin: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500 },

  availRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  availText: { fontFamily: FONTS.semiBold, fontSize: 15, color: c.gray900 },
  availMeta: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500, marginTop: 2 },

  actions: { marginTop: 28, gap: 4 },
}))
