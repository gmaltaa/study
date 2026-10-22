// app/(tabs)/index.tsx — Hoje. A tela que responde, em segundos, "o que eu
// estudo hoje?": as sessões do dia de todos os temas, a sequência de dias e,
// para os temas sem sessão hoje, quando é a próxima.
import { Alert, RefreshControl, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle, CircleIcon as Circle, Fire, Plus, Sparkle } from 'phosphor-react-native'
import { Text } from '@/components/Text'
import { Screen } from '@/components/Screen'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { SubjectIcon } from '@/components/SubjectIcon'
import { EmptyView, ErrorView, LoadingView } from '@/components/StateView'
import { api, errorMessage } from '@/lib/api'
import { invalidateStudy, keys } from '@/lib/query'
import { useAuth } from '@/lib/auth'
import { FONTS } from '@/lib/constants'
import { formatDate, greeting, relativeDay, WEEKDAYS_LONG } from '@/lib/format'
import { makeThemedStyles, useColors } from '@/lib/theme'
import type { SubjectSummary, TodaySession } from '@/lib/types'

export default function TodayScreen() {
  const s = useStyles()
  const c = useColors()
  const router = useRouter()
  const { profile } = useAuth()
  const today = useQuery({ queryKey: keys.today, queryFn: api.today })
  const subjects = useQuery({ queryKey: keys.subjects, queryFn: api.subjects })

  const extra = useMutation({
    mutationFn: (subjectId: string) => api.extraSession(subjectId),
    onSuccess: ({ sessionId, lessonId }) => {
      invalidateStudy()
      router.push({ pathname: '/aula/[id]', params: { id: lessonId, sessionId } })
    },
    onError: (e) => Alert.alert('Não deu certo', errorMessage(e)),
  })

  const refresh = () => { void today.refetch(); void subjects.refetch() }

  if (today.isLoading) return <Screen scroll={false}><LoadingView /></Screen>
  if (today.isError || !today.data) {
    return <Screen scroll={false}><ErrorView message={errorMessage(today.error)} onRetry={refresh} /></Screen>
  }

  const { sessions, later, streak, date } = today.data
  const all = subjects.data ?? []
  const pending = all.filter((x) => x.status === 'generating' || x.status === 'review' || x.status === 'failed')
  const active = all.filter((x) => x.status === 'active')
  const allDone = sessions.length > 0 && sessions.every((x) => x.status === 'completed')
  const minutesLeft = sessions
    .filter((x) => x.status !== 'completed')
    .reduce((n, x) => n + x.lessons.filter((l) => !l.completed).reduce((m, l) => m + l.minutes, 0), 0)
  const firstName = profile?.displayName?.split(' ')[0]
  const weekday = WEEKDAYS_LONG[new Date(`${date}T12:00:00`).getDay()]

  return (
    <Screen refreshControl={<RefreshControl refreshing={today.isRefetching} onRefresh={refresh} tintColor={c.primary} />}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.date}>{weekday}, {formatDate(date)}</Text>
          <Text style={s.hello}>{greeting()}{firstName ? `, ${firstName}` : ''}</Text>
        </View>
        <View style={[s.streak, streak.studiedToday && s.streakOn]}>
          <Fire size={18} color={streak.studiedToday ? c.accent : c.gray500} weight="fill" />
          <Text style={[s.streakText, streak.studiedToday && s.streakTextOn]}>{streak.current}</Text>
        </View>
      </View>

      {pending.map((x) => <PendingBanner key={x.id} subject={x} />)}

      {sessions.length > 0 ? (
        <>
          <Text style={s.section}>
            {allDone ? 'Tudo feito por hoje' : `Para hoje · ${minutesLeft} min`}
          </Text>
          {allDone ? (
            <Card style={s.doneCard}>
              <Sparkle size={28} color={c.accent} weight="fill" />
              <Text style={s.doneTitle}>Você cumpriu o dia!</Text>
              <Text style={s.doneText}>
                {streak.current > 1 ? `${streak.current} dias de estudo seguidos. ` : ''}Quer adiantar a próxima aula?
              </Text>
              <View style={s.extraRow}>
                {active.filter((x) => x.nextLesson).map((x) => (
                  <Button
                    key={x.id}
                    label={`${x.icon} ${x.title}`}
                    variant="secondary"
                    onPress={() => extra.mutate(x.id)}
                    loading={extra.isPending && extra.variables === x.id}
                  />
                ))}
              </View>
            </Card>
          ) : null}
          {sessions.map((x) => <SessionCard key={x.id} session={x} />)}
        </>
      ) : active.length > 0 ? (
        <Card style={s.restCard}>
          <Text style={s.doneTitle}>Hoje não tem sessão marcada</Text>
          <Text style={s.doneText}>Aproveite o descanso, ou adiante uma aula se estiver no pique.</Text>
          <View style={s.extraRow}>
            {active.filter((x) => x.nextLesson).map((x) => (
              <Button
                key={x.id}
                label={`${x.icon} ${x.title}`}
                variant="secondary"
                onPress={() => extra.mutate(x.id)}
                loading={extra.isPending && extra.variables === x.id}
              />
            ))}
          </View>
        </Card>
      ) : pending.length === 0 && subjects.isSuccess ? (
        <EmptyView
          title="O que você quer aprender?"
          message="Crie um tema, diga quanto tempo tem e a gente monta a trilha do zero ao avançado."
          action={<Button label="Criar meu primeiro tema" icon={<Plus size={18} color={c.onPrimary} weight="bold" />} onPress={() => router.push('/tema/novo')} />}
        />
      ) : null}

      {later.length > 0 ? (
        <>
          <Text style={s.section}>Próximos dias</Text>
          {later.map((x) => (
            <Card key={x.id} style={s.laterCard} onPress={() => router.push({ pathname: '/tema/[id]', params: { id: x.id } })}>
              <SubjectIcon icon={x.icon} color={x.color} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={s.laterTitle}>{x.title}</Text>
                {x.nextLesson ? <Text style={s.laterMeta} numberOfLines={1}>{x.nextLesson.title}</Text> : null}
              </View>
              {x.nextSessionDate ? <Text style={s.laterDay}>{relativeDay(x.nextSessionDate, date)}</Text> : null}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  )
}

function SessionCard({ session }: { session: TodaySession }) {
  const s = useStyles()
  const c = useColors()
  const router = useRouter()
  const done = session.status === 'completed'
  const next = session.lessons.find((l) => !l.completed)
  const started = session.lessons.some((l) => l.completed) || session.status === 'in_progress'
  const minutes = session.lessons.reduce((n, l) => n + l.minutes, 0)

  return (
    <Card style={[s.sessionCard, done && s.sessionDone]}>
      <View style={s.sessionHeader}>
        <SubjectIcon icon={session.subject.icon} color={session.subject.color} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={s.sessionSubject}>{session.subject.title}</Text>
          <Text style={s.sessionMeta}>{session.isExtra ? 'Aula extra' : `Sessão ${session.slot}`} · {minutes} min</Text>
        </View>
        {done ? <CheckCircle size={26} color={c.green} weight="fill" /> : null}
      </View>
      <View style={s.lessons}>
        {session.lessons.map((l) => (
          <View key={l.id} style={s.lessonRow}>
            {l.completed ? <CheckCircle size={18} color={c.green} weight="fill" /> : <Circle size={18} color={c.gray300} weight="bold" />}
            <Text style={[s.lessonTitle, l.completed && s.lessonDone]} numberOfLines={2}>{l.title}</Text>
            <Text style={s.lessonMin}>{l.minutes} min</Text>
          </View>
        ))}
      </View>
      {!done && next ? (
        <Button
          label={started ? 'Continuar' : 'Começar'}
          onPress={() => router.push({ pathname: '/aula/[id]', params: { id: next.id, sessionId: session.id } })}
          style={{ marginTop: 14 }}
        />
      ) : null}
    </Card>
  )
}

function PendingBanner({ subject }: { subject: SubjectSummary }) {
  const s = useStyles()
  const router = useRouter()
  const text = subject.status === 'generating'
    ? 'Montando a trilha…'
    : subject.status === 'review'
      ? 'Trilha pronta. Toque para revisar e começar.'
      : 'Não conseguimos montar a trilha. Toque para tentar de novo.'
  return (
    <Card style={s.banner} onPress={() => router.push({ pathname: '/tema/[id]', params: { id: subject.id } })}>
      <SubjectIcon icon={subject.icon} color={subject.color} size={36} />
      <View style={{ flex: 1 }}>
        <Text style={s.bannerTitle}>{subject.title}</Text>
        <Text style={s.bannerText}>{text}</Text>
      </View>
    </Card>
  )
}

const useStyles = makeThemedStyles((c) => ({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  date: { fontFamily: FONTS.semiBold, fontSize: 14, color: c.gray500, textTransform: 'capitalize' },
  hello: { fontFamily: FONTS.extraBold, fontSize: 28, color: c.gray900, marginTop: 2 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: c.gray100 },
  streakOn: { backgroundColor: c.accentSoft },
  streakText: { fontFamily: FONTS.bold, fontSize: 16, color: c.gray600 },
  streakTextOn: { color: c.gray900 },

  section: { fontFamily: FONTS.bold, fontSize: 18, color: c.gray900, marginTop: 24, marginBottom: 12 },

  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, borderColor: c.primaryBorder, backgroundColor: c.primarySoft },
  bannerTitle: { fontFamily: FONTS.bold, fontSize: 15, color: c.gray900 },
  bannerText: { fontFamily: FONTS.regular, fontSize: 14, color: c.gray700, marginTop: 2 },

  sessionCard: { marginBottom: 12 },
  sessionDone: { opacity: 0.75 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sessionSubject: { fontFamily: FONTS.bold, fontSize: 17, color: c.gray900 },
  sessionMeta: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500, marginTop: 2 },
  lessons: { marginTop: 12, gap: 8 },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lessonTitle: { flex: 1, fontFamily: FONTS.medium, fontSize: 15, color: c.gray900, lineHeight: 20 },
  lessonDone: { color: c.gray500, textDecorationLine: 'line-through' },
  lessonMin: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500 },

  doneCard: { alignItems: 'center', marginBottom: 12, gap: 6 },
  restCard: { alignItems: 'center', marginTop: 20, gap: 6 },
  doneTitle: { fontFamily: FONTS.extraBold, fontSize: 18, color: c.gray900, textAlign: 'center' },
  doneText: { fontFamily: FONTS.regular, fontSize: 15, color: c.gray600, textAlign: 'center', lineHeight: 21 },
  extraRow: { alignSelf: 'stretch', gap: 8, marginTop: 10 },

  laterCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  laterTitle: { fontFamily: FONTS.bold, fontSize: 15, color: c.gray900 },
  laterMeta: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500, marginTop: 2 },
  laterDay: { fontFamily: FONTS.semiBold, fontSize: 13, color: c.primary, textTransform: 'capitalize' },
}))
