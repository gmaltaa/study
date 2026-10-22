// app/tema/[id]/biblioteca.tsx — a biblioteca do tema: os vídeos, podcasts,
// imagens e leituras trazidos para as aulas, organizados por módulo. As aulas
// futuras entram aqui conforme são preparadas.
import { useState } from 'react'
import { RefreshControl, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { FilmStripIcon } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { Screen } from '@/components/ui/Screen'
import { PageHeader } from '@/components/ui/PageHeader'
import { ChipGroup } from '@/components/ui/Chip'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/StateView'
import { MediaBlock } from '@/components/media/MediaBlock'
import { api, errorMessage } from '@/lib/api'
import { keys } from '@/lib/query'
import { SPACE } from '@/lib/constants'
import { useColors } from '@/lib/theme'
import type { MediaItem } from '@/lib/types'

type Filter = 'all' | MediaItem['kind']

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tudo' },
  { value: 'video', label: 'Vídeos' },
  { value: 'podcast', label: 'Podcasts' },
  { value: 'image', label: 'Imagens' },
  { value: 'article', label: 'Leituras' },
]

export default function SubjectLibrary() {
  const c = useColors()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [filter, setFilter] = useState<Filter>('all')
  const query = useQuery({ queryKey: keys.subjectMedia(id), queryFn: () => api.subjectMedia(id) })

  if (query.isLoading) return <Screen back scroll={false}><LoadingView /></Screen>
  if (query.isError || !query.data) {
    return <Screen back scroll={false}><ErrorView message={errorMessage(query.error)} onRetry={() => query.refetch()} /></Screen>
  }

  const modules = query.data.modules
    .map((m) => ({ ...m, items: m.items.filter((i) => filter === 'all' || i.kind === filter) }))
    .filter((m) => m.items.length > 0)

  return (
    <Screen back refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={c.text} />}>
      <PageHeader title="Biblioteca" subtitle="Vídeos, podcasts, imagens e leituras das suas aulas. As próximas entram aqui conforme ficam prontas." />
      <ChipGroup options={FILTERS} value={filter} onChange={setFilter} />
      {modules.length === 0 ? (
        <EmptyView
          icon={<FilmStripIcon />}
          title="Nada por aqui ainda"
          message={filter === 'all'
            ? 'O conteúdo aparece quando as aulas são preparadas, 1 ou 2 dias antes de cada uma.'
            : 'Nenhum conteúdo desse tipo nas aulas preparadas até agora.'}
        />
      ) : (
        modules.map((m) => (
          <View key={m.id}>
            <SectionHeader title={`Módulo ${m.position}`} description={m.title} />
            <View style={{ gap: SPACE.xxl }}>
              {m.items.map((item) => (
                <View key={item.id} style={{ gap: SPACE.sm }}>
                  <Text
                    variant="micro"
                    tone="secondary"
                    onPress={() => router.push({ pathname: '/aula/[id]', params: { id: item.lesson.id } })}
                    accessibilityRole="link"
                  >
                    Aula {item.lesson.position} · {item.lesson.title}
                  </Text>
                  <MediaBlock item={item} />
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </Screen>
  )
}
