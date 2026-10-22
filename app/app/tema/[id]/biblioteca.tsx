// app/tema/[id]/biblioteca.tsx — a biblioteca do tema: os vídeos, podcasts,
// imagens e leituras trazidos para as aulas, organizados por módulo. As aulas
// futuras entram aqui conforme são preparadas.
import { useState } from 'react'
import { RefreshControl, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Text } from '@/components/Text'
import { Screen } from '@/components/Screen'
import { Chip } from '@/components/Chip'
import { MediaBlock } from '@/components/media/MediaBlock'
import { EmptyView, ErrorView, LoadingView } from '@/components/StateView'
import { api, errorMessage } from '@/lib/api'
import { keys } from '@/lib/query'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'
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
  const s = useStyles()
  const c = useColors()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [filter, setFilter] = useState<Filter>('all')
  const query = useQuery({ queryKey: keys.subjectMedia(id), queryFn: () => api.subjectMedia(id) })

  if (query.isLoading) return <Screen back title="Biblioteca" scroll={false}><LoadingView /></Screen>
  if (query.isError || !query.data) {
    return <Screen back title="Biblioteca" scroll={false}><ErrorView message={errorMessage(query.error)} onRetry={() => query.refetch()} /></Screen>
  }

  const modules = query.data.modules
    .map((m) => ({ ...m, items: m.items.filter((i) => filter === 'all' || i.kind === filter) }))
    .filter((m) => m.items.length > 0)

  return (
    <Screen
      back
      title="Biblioteca"
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={c.primary} />}
    >
      <Text style={s.lead}>Vídeos, podcasts, imagens e leituras das suas aulas. As próximas aulas entram aqui conforme ficam prontas.</Text>
      <View style={s.filters}>
        {FILTERS.map((f) => <Chip key={f.value} label={f.label} selected={filter === f.value} onPress={() => setFilter(f.value)} />)}
      </View>
      {modules.length === 0 ? (
        <EmptyView
          title="Nada por aqui ainda"
          message={filter === 'all'
            ? 'O conteúdo aparece quando as aulas são preparadas, 1 ou 2 dias antes de cada uma.'
            : 'Nenhum conteúdo desse tipo nas aulas preparadas até agora.'}
        />
      ) : (
        modules.map((m) => (
          <View key={m.id} style={s.module}>
            <Text style={s.moduleTitle}>Módulo {m.position} · {m.title}</Text>
            {m.items.map((item) => (
              <View key={item.id} style={s.item}>
                <TouchableOpacity onPress={() => router.push({ pathname: '/aula/[id]', params: { id: item.lesson.id } })} hitSlop={6}>
                  <Text style={s.lesson}>Aula {item.lesson.position}: {item.lesson.title}</Text>
                </TouchableOpacity>
                <MediaBlock item={item} />
              </View>
            ))}
          </View>
        ))
      )}
    </Screen>
  )
}

const useStyles = makeThemedStyles((c) => ({
  lead: { fontFamily: FONTS.regular, fontSize: 15, color: c.gray600, lineHeight: 21 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  module: { marginTop: 28, gap: 20 },
  moduleTitle: { fontFamily: FONTS.extraBold, fontSize: 18, color: c.gray900 },
  item: { gap: 8 },
  lesson: { fontFamily: FONTS.semiBold, fontSize: 13, color: c.primary },
}))
