// app/(tabs)/temas.tsx — todos os temas, cada um com a sua trilha e progresso.
import { RefreshControl, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { BooksIcon, PlusIcon } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { Screen } from '@/components/ui/Screen'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/StateView'
import { SubjectCard } from '@/components/SubjectCard'
import { api, errorMessage } from '@/lib/api'
import { keys } from '@/lib/query'
import { SPACE } from '@/lib/constants'
import { useColors } from '@/lib/theme'

/** Mesmo limite do backend (lib/limits.ts → activeSubjects). */
const MAX_ACTIVE = 3

export default function SubjectsScreen() {
  const c = useColors()
  const router = useRouter()
  const query = useQuery({ queryKey: keys.subjects, queryFn: api.subjects })
  const add = (
    <IconButton onPress={() => router.push('/tema/novo')} accessibilityLabel="Novo tema">
      <PlusIcon />
    </IconButton>
  )

  if (query.isLoading) return <Screen right={add} scroll={false}><LoadingView /></Screen>
  if (query.isError) return <Screen right={add} scroll={false}><ErrorView message={errorMessage(query.error)} onRetry={() => query.refetch()} /></Screen>
  const subjects = query.data ?? []

  return (
    <Screen right={add} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={c.text} />}>
      <PageHeader title="Temas" subtitle="Cada tema tem a sua trilha, o seu cronograma e o seu progresso." />
      {subjects.length === 0 ? (
        <EmptyView
          icon={<BooksIcon />}
          title="Nenhum tema ainda"
          message={`Você pode estudar até ${MAX_ACTIVE} temas ao mesmo tempo.`}
          action={<Button label="Criar tema" onPress={() => router.push('/tema/novo')} />}
        />
      ) : (
        <View style={{ gap: SPACE.md }}>
          {subjects.map((x) => (
            <SubjectCard key={x.id} subject={x} onPress={() => router.push({ pathname: '/tema/[id]', params: { id: x.id } })} />
          ))}
          <Text variant="caption" tone="tertiary" align="center" style={{ marginTop: SPACE.sm }}>
            Até {MAX_ACTIVE} temas ativos ao mesmo tempo.
          </Text>
        </View>
      )}
    </Screen>
  )
}
