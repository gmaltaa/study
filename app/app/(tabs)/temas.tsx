// app/(tabs)/temas.tsx — todos os temas, cada um com a sua trilha e progresso.
import { RefreshControl, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'phosphor-react-native'
import { Text } from '@/components/Text'
import { Screen } from '@/components/Screen'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { ProgressBar } from '@/components/ProgressBar'
import { SubjectIcon } from '@/components/SubjectIcon'
import { EmptyView, ErrorView, LoadingView } from '@/components/StateView'
import { api, errorMessage } from '@/lib/api'
import { keys } from '@/lib/query'
import { FONTS } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import { makeThemedStyles, subjectColor, useColors } from '@/lib/theme'
import type { SubjectSummary } from '@/lib/types'

const STATUS_LABEL: Record<SubjectSummary['status'], string | null> = {
  generating: 'Montando trilha',
  review: 'Pronta para revisar',
  failed: 'Falhou',
  paused: 'Pausado',
  completed: 'Concluído',
  active: null,
}

export default function SubjectsScreen() {
  const s = useStyles()
  const c = useColors()
  const router = useRouter()
  const query = useQuery({ queryKey: keys.subjects, queryFn: api.subjects })

  const newButton = (
    <TouchableOpacity onPress={() => router.push('/tema/novo')} hitSlop={8} style={s.add}>
      <Plus size={20} color={c.onPrimary} weight="bold" />
    </TouchableOpacity>
  )

  if (query.isLoading) return <Screen scroll={false}><LoadingView /></Screen>
  if (query.isError) return <Screen scroll={false}><ErrorView message={errorMessage(query.error)} onRetry={() => query.refetch()} /></Screen>
  const subjects = query.data ?? []

  return (
    <Screen refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={c.primary} />}>
      <View style={s.header}>
        <Text style={s.title}>Temas</Text>
        {newButton}
      </View>
      {subjects.length === 0 ? (
        <EmptyView
          title="Nenhum tema ainda"
          message="Cada tema tem a própria trilha, cronograma e progresso. Você pode estudar até 3 ao mesmo tempo."
          action={<Button label="Criar tema" onPress={() => router.push('/tema/novo')} />}
        />
      ) : (
        subjects.map((x) => {
          const label = STATUS_LABEL[x.status]
          return (
            <Card key={x.id} style={s.card} onPress={() => router.push({ pathname: '/tema/[id]', params: { id: x.id } })}>
              <View style={s.row}>
                <SubjectIcon icon={x.icon} color={x.color} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{x.title}</Text>
                  {label ? <Text style={s.status}>{label}</Text> : null}
                </View>
              </View>
              {x.progress.total > 0 ? (
                <View style={{ marginTop: 14 }}>
                  <ProgressBar percent={x.progress.percent} color={subjectColor(x.color)} />
                  <View style={s.metaRow}>
                    <Text style={s.meta}>{x.progress.completed} de {x.progress.total} aulas</Text>
                    {x.endDate && x.status === 'active' ? <Text style={s.meta}>Termina em {formatDate(x.endDate)}</Text> : null}
                  </View>
                  {x.nextLesson && x.status === 'active' ? (
                    <Text style={s.next} numberOfLines={1}>Próxima: {x.nextLesson.title}</Text>
                  ) : null}
                </View>
              ) : null}
            </Card>
          )
        })
      )}
    </Screen>
  )
}

const useStyles = makeThemedStyles((c) => ({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingBottom: 16 },
  title: { fontFamily: FONTS.extraBold, fontSize: 28, color: c.gray900 },
  add: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 17, color: c.gray900 },
  status: { fontFamily: FONTS.semiBold, fontSize: 13, color: c.primary, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  meta: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500 },
  next: { fontFamily: FONTS.medium, fontSize: 14, color: c.gray700, marginTop: 8 },
}))
