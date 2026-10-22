// app/(tabs)/index.tsx — Hoje. Responde em segundos "o que eu estudo hoje?":
// a saudação, as sessões do dia de todos os temas, a sequência de dias e,
// para os temas sem sessão hoje, quando é a próxima.
import { Alert, RefreshControl, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { BookOpenTextIcon, FireIcon, PlusIcon } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { Screen } from '@/components/ui/Screen'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Cover } from '@/components/ui/Cover'
import { IconButton } from '@/components/ui/IconButton'
import { ListGroup } from '@/components/ui/ListGroup'
import { ListRow } from '@/components/ui/ListRow'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Tag } from '@/components/ui/Tag'
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/StateView'
import { SessionCard } from '@/components/SessionCard'
import { SubjectCard } from '@/components/SubjectCard'
import { api, errorMessage } from '@/lib/api'
import { invalidateStudy, keys } from '@/lib/query'
import { useAuth } from '@/lib/auth'
import { SPACE } from '@/lib/constants'
import { formatDate, greeting, relativeDay, WEEKDAYS_LONG } from '@/lib/format'
import { useColors } from '@/lib/theme'
import type { SubjectSummary } from '@/lib/types'

export default function TodayScreen() {
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
  const newSubject = (
    <IconButton variant="outline" onPress={() => router.push('/tema/novo')} accessibilityLabel="Novo tema">
      <PlusIcon />
    </IconButton>
  )

  if (today.isLoading) return <Screen scroll={false}><LoadingView /></Screen>
  if (today.isError || !today.data) {
    return <Screen scroll={false}><ErrorView message={errorMessage(today.error)} onRetry={refresh} /></Screen>
  }

  const { sessions, later, streak, date } = today.data
  const all = subjects.data ?? []
  const waiting = all.filter((x) => x.status === 'generating' || x.status === 'review' || x.status === 'failed')
  const active = all.filter((x) => x.status === 'active' && x.nextLesson)
  const allDone = sessions.length > 0 && sessions.every((x) => x.status === 'completed')
  const pending = sessions.filter((x) => x.status !== 'completed')
  const minutesLeft = pending.reduce((n, x) => n + x.lessons.filter((l) => !l.completed).reduce((m, l) => m + l.minutes, 0), 0)
  const firstName = profile?.displayName?.split(' ')[0]
  const weekday = WEEKDAYS_LONG[new Date(`${date}T12:00:00`).getDay()]
  const summary = sessions.length === 0
    ? 'Nada marcado para hoje.'
    : allDone
      ? 'Tudo feito por hoje.'
      : `${pending.length} ${pending.length === 1 ? 'sessão' : 'sessões'} · ${minutesLeft} min`

  const advance = (list: SubjectSummary[]) => (
    <View style={{ gap: SPACE.sm, marginTop: SPACE.lg }}>
      {list.map((x) => (
        <Button
          key={x.id}
          label={`Adiantar ${x.title}`}
          variant="secondary"
          size="md"
          onPress={() => extra.mutate(x.id)}
          loading={extra.isPending && extra.variables === x.id}
        />
      ))}
    </View>
  )

  return (
    <Screen
      right={newSubject}
      refreshControl={<RefreshControl refreshing={today.isRefetching} onRefresh={refresh} tintColor={c.text} />}
    >
      <View style={{ gap: SPACE.sm, paddingTop: SPACE.sm }}>
        <Tag
          label={`${streak.current} ${streak.current === 1 ? 'dia seguido' : 'dias seguidos'}`}
          variant={streak.studiedToday ? 'accent' : 'muted'}
          icon={<FireIcon />}
        />
        <Text variant="display" accessibilityRole="header">{greeting()}{firstName ? `, ${firstName}` : ''}</Text>
        <Text variant="body" tone="secondary">
          <Text variant="body" tone="secondary" style={{ textTransform: 'capitalize' }}>{weekday}</Text>, {formatDate(date)} · {summary}
        </Text>
      </View>

      {waiting.length > 0 ? (
        <>
          <SectionHeader title="Esperando você" />
          <View style={{ gap: SPACE.md }}>
            {waiting.map((x) => (
              <SubjectCard key={x.id} subject={x} compact onPress={() => router.push({ pathname: '/tema/[id]', params: { id: x.id } })} />
            ))}
          </View>
        </>
      ) : null}

      {sessions.length > 0 ? (
        <>
          <SectionHeader title="Para hoje" />
          {allDone ? (
            <Card variant="muted" style={{ marginBottom: SPACE.md }}>
              <Text variant="heading">Dia cumprido.</Text>
              <Text variant="body" tone="secondary" style={{ marginTop: SPACE.xs }}>
                {streak.current > 1 ? `${streak.current} dias de estudo seguidos. ` : ''}Se estiver no pique, dá para adiantar a próxima aula.
              </Text>
              {advance(active)}
            </Card>
          ) : null}
          <View style={{ gap: SPACE.md }}>
            {sessions.map((x) => <SessionCard key={x.id} session={x} />)}
          </View>
        </>
      ) : active.length > 0 ? (
        <Card variant="muted" style={{ marginTop: SPACE.xxl }}>
          <Text variant="heading">Hoje não tem sessão marcada.</Text>
          <Text variant="body" tone="secondary" style={{ marginTop: SPACE.xs }}>Aproveite o descanso, ou adiante uma aula.</Text>
          {advance(active)}
        </Card>
      ) : waiting.length === 0 && subjects.isSuccess ? (
        <EmptyView
          icon={<BookOpenTextIcon />}
          title="O que você quer aprender?"
          message="Crie um tema, diga quanto tempo tem e a gente monta a trilha do zero ao avançado."
          action={<Button label="Criar meu primeiro tema" onPress={() => router.push('/tema/novo')} />}
        />
      ) : null}

      {later.length > 0 ? (
        <>
          <SectionHeader title="Próximos dias" />
          <ListGroup inset={64}>
            {later.map((x) => (
              <ListRow
                key={x.id}
                leading={<Cover icon={x.icon} color={x.color} size={36} />}
                title={x.title}
                subtitle={x.nextLesson?.title}
                value={x.nextSessionDate ? relativeDay(x.nextSessionDate, date) : null}
                onPress={() => router.push({ pathname: '/tema/[id]', params: { id: x.id } })}
              />
            ))}
          </ListGroup>
        </>
      ) : null}
    </Screen>
  )
}
