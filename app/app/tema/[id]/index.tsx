// app/tema/[id]/index.tsx — o tema. A tela muda com o estado dele:
//   generating → a trilha está sendo montada (consulta a cada 3 s)
//   failed     → deu errado, tentar de novo
//   review     → prévia da trilha: começar ou pedir ajuste
//   active / paused / completed → progresso, o que vem a seguir e a trilha
import { useState } from 'react'
import { ActivityIndicator, Alert, RefreshControl, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArchiveIcon, CalendarBlankIcon, CircleDashedIcon, ClockIcon, FilmStripIcon, PauseIcon, PlayCircleIcon, PlayIcon,
  TrashIcon, WarningIcon,
} from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Cover } from '@/components/ui/Cover'
import { Composer } from '@/components/ui/Composer'
import { ListGroup } from '@/components/ui/ListGroup'
import { ListRow } from '@/components/ui/ListRow'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Sheet } from '@/components/ui/Sheet'
import { Tag } from '@/components/ui/Tag'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { ErrorView, LoadingView } from '@/components/ui/StateView'
import { ModuleList } from '@/components/ModuleList'
import { api, ApiError, errorMessage } from '@/lib/api'
import { invalidateStudy, keys, queryClient } from '@/lib/query'
import { setProfileCache, useAuth } from '@/lib/auth'
import { track } from '@/lib/analytics'
import { toast } from '@/lib/toast'
import { GUTTER, RADIUS, SPACE } from '@/lib/constants'
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

/** Capa e título do tema, no topo das telas do tema. */
function SubjectHero({ subject, eyebrow }: { subject: SubjectDetail; eyebrow?: string | null }) {
  const s = useStyles()
  return (
    <View style={s.hero}>
      <Cover icon={subject.icon} color={subject.color} size={88} />
      <View style={{ flex: 1, gap: SPACE.xs }}>
        {eyebrow ? <Text variant="eyebrow" tone="secondary">{eyebrow}</Text> : null}
        <Text variant="title" accessibilityRole="header">{subject.title}</Text>
      </View>
    </View>
  )
}

/** Aviso amarelo: prazo estourado, ajuste que falhou. */
function Notice({ children }: { children: string }) {
  const s = useStyles()
  const c = useColors()
  return (
    <View style={s.notice}>
      <WarningIcon size={18} color={c.warning} />
      <Text variant="body" style={{ flex: 1 }}>{children}</Text>
    </View>
  )
}

// ─── Gerando ───────────────────────────────────────────────────────────────

const GENERATING_STEPS = [
  'Dividindo o assunto em módulos',
  'Ordenando do básico ao avançado',
  'Separando as aulas de cada módulo',
  'Encaixando tudo no seu tempo',
]

function Generating({ subject }: { subject: SubjectDetail }) {
  const c = useColors()
  const router = useRouter()
  const { profile } = useAuth()
  const adjusting = !!subject.path?.adjustmentRequest
  return (
    <Screen back={!!profile?.onboardedAt} onBack={() => router.replace('/')}>
      <SubjectHero subject={subject} eyebrow={adjusting ? 'Ajustando a trilha' : 'Montando a trilha'} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.xxl }}>
        <ActivityIndicator color={c.text} />
        <Text variant="body" tone="secondary">Leva até 2 minutos.</Text>
      </View>
      <ListGroup style={{ marginTop: SPACE.lg }}>
        {GENERATING_STEPS.map((step) => <ListRow key={step} leading={<CircleDashedIcon color={c.textTertiary} />} title={step} />)}
      </ListGroup>
      <Text variant="caption" tone="tertiary" style={{ marginTop: SPACE.lg }}>
        Pode sair desta tela. A trilha fica pronta em Temas.
      </Text>
    </Screen>
  )
}

// ─── Falhou ────────────────────────────────────────────────────────────────

function Failed({ subject }: { subject: SubjectDetail }) {
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
    <Screen
      back
      footer={
        <>
          <Button label="Tentar de novo" onPress={() => retry.mutate()} loading={retry.isPending} />
          <Button label="Excluir tema" variant="ghost" onPress={() => setConfirmDelete(true)} />
        </>
      }
    >
      <SubjectHero subject={subject} eyebrow="Não deu certo" />
      <Text variant="reading" tone="secondary" style={{ marginTop: SPACE.xl }}>
        {subject.failureReason ?? 'Não conseguimos montar a trilha. Foi um problema do nosso lado; tente de novo.'}
      </Text>
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
      toast.success('Trilha pronta. A primeira aula está em Hoje.')
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
      <SubjectHero subject={subject} eyebrow="Sua trilha está pronta" />
      {subject.goal ? <Text variant="reading" tone="secondary" style={{ marginTop: SPACE.xl }}>{subject.goal}</Text> : null}
      {subject.failureReason ? <View style={{ marginTop: SPACE.lg }}><Notice>{subject.failureReason}</Notice></View> : null}

      <View style={s.stats}>
        <Stat value={String(modules.length)} label="módulos" />
        <Stat value={String(lessons)} label="aulas" />
        <Stat value={formatHours(total)} label="de estudo" />
      </View>

      {subject.endDate ? (
        <ListGroup style={{ marginTop: SPACE.md }}>
          <ListRow
            leading={<CalendarBlankIcon />}
            title={`Termina em ${formatDate(subject.endDate)}`}
            subtitle={subject.availability ? `${formatDays(subject.availability.daysOfWeek)}, ${subject.availability.dailyMinutes} min por dia` : null}
          />
        </ListGroup>
      ) : null}
      {!subject.fitsDeadline && subject.deadline ? (
        <View style={{ marginTop: SPACE.md }}>
          <Notice>{`Passa do seu prazo (${formatDate(subject.deadline)}). Peça um ajuste ou aumente o tempo por dia.`}</Notice>
        </View>
      ) : null}

      <SectionHeader title="Do básico ao avançado" description="Cada módulo se apoia no anterior." />
      <ModuleList modules={modules} />
      {subject.disclaimer ? <Text variant="caption" tone="tertiary" style={{ marginTop: SPACE.xl }}>{subject.disclaimer}</Text> : null}

      <Sheet visible={adjustOpen} onClose={() => setAdjustOpen(false)} title="O que mudar na trilha?" avoidKeyboard>
        <View style={{ paddingHorizontal: GUTTER }}>
          <Composer
            value={adjustText}
            onChangeText={setAdjustText}
            placeholder="Ex.: menos Império e mais República"
            onSubmit={() => adjust.mutate()}
            loading={adjust.isPending}
            minHeight={96}
            autoFocus
          />
        </View>
      </Sheet>
    </Screen>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  const s = useStyles()
  return (
    <View style={s.stat}>
      <Text variant="heading">{value}</Text>
      <Text variant="caption" tone="secondary">{label}</Text>
    </View>
  )
}

// ─── Tema ativo ────────────────────────────────────────────────────────────

function Detail({ subject, refreshing, onRefresh }: { subject: SubjectDetail; refreshing: boolean; onRefresh: () => void }) {
  const c = useColors()
  const router = useRouter()
  const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null)
  const today = toISODate(new Date())
  const paused = subject.status === 'paused'
  const completed = subject.status === 'completed'
  const { progress } = subject

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

  const next = subject.nextLesson
  const nextIsToday = subject.nextSessionDate === today

  return (
    <Screen back refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.text} />}>
      <SubjectHero subject={subject} eyebrow={paused ? 'Pausado' : completed ? 'Concluído' : null} />
      {subject.goal ? <Text variant="reading" tone="secondary" style={{ marginTop: SPACE.xl }}>{subject.goal}</Text> : null}

      <Card style={{ marginTop: SPACE.xl, gap: SPACE.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text variant="title">{progress.percent}%</Text>
          <Text variant="caption" tone="secondary">
            {progress.completed} de {progress.total} aulas · {formatMinutes(progress.minutesDone)} de {formatHours(progress.minutesTotal)}
          </Text>
        </View>
        <ProgressBar percent={progress.percent} />
        {subject.endDate && !completed ? <Text variant="caption" tone="secondary">Termina em {formatDate(subject.endDate)}</Text> : null}
      </Card>
      {!subject.fitsDeadline && subject.deadline && !completed ? (
        <View style={{ marginTop: SPACE.md }}>
          <Notice>{`No ritmo atual, passa do prazo (${formatDate(subject.deadline)}). Aumente o tempo por dia para recuperar.`}</Notice>
        </View>
      ) : null}

      <SectionHeader title="Aprender" />
      <View style={{ gap: SPACE.sm }}>
        {next && !paused && !completed ? (
          <ListRow
            variant="outline"
            leading={<PlayCircleIcon />}
            title={next.title}
            subtitle={nextIsToday ? 'Na sessão de hoje' : subject.nextSessionDate ? `Marcada para ${relativeDay(subject.nextSessionDate, today)}. Toque para adiantar.` : 'Próxima aula'}
            trailing={extra.isPending ? <ActivityIndicator color={c.text} /> : <Tag label={nextIsToday ? 'Hoje' : 'Adiantar'} variant={nextIsToday ? 'solid' : 'outline'} />}
            onPress={() => (nextIsToday ? router.replace('/') : extra.mutate())}
          />
        ) : null}
        <ListRow
          variant="outline"
          leading={<FilmStripIcon />}
          title="Biblioteca do tema"
          subtitle="Vídeos, podcasts, imagens e leituras das aulas"
          chevron
          onPress={() => router.push({ pathname: '/tema/[id]/biblioteca', params: { id: subject.id } })}
        />
      </View>

      {subject.upcoming.length > 0 && !paused ? (
        <>
          <SectionHeader title="Próximas sessões" />
          <ListGroup inset={16}>
            {subject.upcoming.slice(0, 5).map((x) => (
              <ListRow
                key={`${x.date}-${x.slot}`}
                title={x.lessons.map((l) => l.title).join(' · ')}
                subtitle={`${x.lessons.reduce((n, l) => n + l.minutes, 0)} min`}
                value={relativeDay(x.date, today)}
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      <SectionHeader title="Trilha" />
      <ModuleList
        modules={subject.path?.modules ?? []}
        showProgress
        onLessonPress={(lessonId) => router.push({ pathname: '/aula/[id]', params: { id: lessonId } })}
      />

      <SectionHeader title="Ajustes" />
      <ListGroup>
        {subject.availability ? (
          <ListRow
            leading={<ClockIcon />}
            title="Disponibilidade"
            subtitle={`${formatDays(subject.availability.daysOfWeek)}, ${subject.availability.dailyMinutes} min por dia${subject.availability.reminderTime ? ` · lembrete às ${subject.availability.reminderTime}` : ''}`}
            chevron
            onPress={() => router.push({ pathname: '/tema/[id]/disponibilidade', params: { id: subject.id } })}
          />
        ) : null}
        {!completed ? (
          <ListRow
            leading={paused ? <PlayIcon /> : <PauseIcon />}
            title={paused ? 'Retomar tema' : 'Pausar tema'}
            trailing={toggle.isPending ? <ActivityIndicator color={c.text} /> : null}
            onPress={() => toggle.mutate()}
          />
        ) : null}
        <ListRow leading={<ArchiveIcon />} title="Arquivar" onPress={() => setConfirm('archive')} />
        <ListRow leading={<TrashIcon />} title="Excluir tema" destructive onPress={() => setConfirm('delete')} />
      </ListGroup>
      {subject.disclaimer ? <Text variant="caption" tone="tertiary" style={{ marginTop: SPACE.xl }}>{subject.disclaimer}</Text> : null}

      <ConfirmSheet
        visible={confirm === 'archive'}
        title="Arquivar este tema?"
        message="Ele sai de Hoje e da lista de temas e libera espaço para um tema novo. O progresso fica guardado."
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
  hero: { flexDirection: 'row', alignItems: 'center', gap: SPACE.lg, paddingTop: SPACE.lg },
  notice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md,
    backgroundColor: c.warningSoft, borderRadius: RADIUS.lg, padding: SPACE.lg,
  },
  stats: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.xl },
  stat: { flex: 1, backgroundColor: c.surfaceMuted, borderRadius: RADIUS.lg, paddingVertical: SPACE.lg, alignItems: 'center', gap: 2 },
}))
