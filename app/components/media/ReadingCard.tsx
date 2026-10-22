// components/media/ReadingCard.tsx — leitura para aprofundar: o começo do
// artigo da Wikipédia e o link para ler inteiro.
import { Image, Linking, View } from 'react-native'
import { ArrowUpRightIcon, ArticleIcon } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { RADIUS, SPACE } from '@/lib/constants'
import { useColors } from '@/lib/theme'
import type { MediaItem } from '@/lib/types'

export function ReadingCard({ item }: { item: MediaItem }) {
  const c = useColors()
  return (
    <Card onPress={() => Linking.openURL(item.url)} accessibilityLabel={`Ler na Wikipédia: ${item.title}`} style={{ gap: SPACE.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
        {item.thumbnailUrl
          ? <Image source={{ uri: item.thumbnailUrl }} style={{ width: 48, height: 48, borderRadius: RADIUS.sm, backgroundColor: c.surfaceMuted }} />
          : (
            <View style={{ width: 48, height: 48, borderRadius: RADIUS.sm, backgroundColor: c.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
              <ArticleIcon size={22} color={c.textSecondary} />
            </View>
          )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="subheading" numberOfLines={2}>{item.title}</Text>
          <Text variant="caption" tone="secondary">Wikipédia</Text>
        </View>
      </View>
      {item.description ? <Text variant="body" tone="secondary" numberOfLines={4}>{item.description}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.xs }}>
        <Text variant="labelStrong">Ler o artigo</Text>
        <ArrowUpRightIcon size={16} color={c.text} />
      </View>
    </Card>
  )
}
