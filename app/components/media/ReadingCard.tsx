// components/media/ReadingCard.tsx — leitura para aprofundar: o começo do
// artigo da Wikipédia e o link para ler inteiro.
import { Image, Linking, TouchableOpacity, View } from 'react-native'
import { ArticleIcon } from 'phosphor-react-native'
import { Text } from '@/components/Text'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'
import type { MediaItem } from '@/lib/types'

export function ReadingCard({ item }: { item: MediaItem }) {
  const s = useStyles()
  const c = useColors()
  return (
    <TouchableOpacity style={s.card} onPress={() => Linking.openURL(item.url)} activeOpacity={0.8}>
      <View style={s.row}>
        {item.thumbnailUrl
          ? <Image source={{ uri: item.thumbnailUrl }} style={s.thumb} />
          : <View style={[s.thumb, s.thumbEmpty]}><ArticleIcon size={22} color={c.gray500} weight="bold" /></View>}
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{item.title}</Text>
          <Text style={s.source}>Wikipédia</Text>
        </View>
      </View>
      {item.description ? <Text style={s.excerpt} numberOfLines={4}>{item.description}</Text> : null}
      <Text style={s.link}>Ler o artigo completo</Text>
    </TouchableOpacity>
  )
}

const useStyles = makeThemedStyles((c) => ({
  card: { backgroundColor: c.white, borderRadius: 16, borderWidth: 1, borderColor: c.gray100, padding: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: c.gray100 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FONTS.bold, fontSize: 15, color: c.gray900, lineHeight: 20 },
  source: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500, marginTop: 2 },
  excerpt: { fontFamily: FONTS.regular, fontSize: 14, color: c.gray700, lineHeight: 20 },
  link: { fontFamily: FONTS.bold, fontSize: 14, color: c.primary },
}))
