// components/media/MediaImage.tsx — imagem real (Wikimedia) no meio da aula,
// com legenda e o crédito que a licença exige. Tocar abre a página da imagem.
import { Image, Linking, TouchableOpacity, View } from 'react-native'
import { Text } from '@/components/Text'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles } from '@/lib/theme'
import type { MediaItem } from '@/lib/types'

export function MediaImage({ item }: { item: MediaItem }) {
  const s = useStyles()
  if (!item.mediaUrl) return null
  const ratio = item.width && item.height ? item.width / item.height : 4 / 3
  return (
    <View style={s.wrap}>
      <TouchableOpacity onPress={() => Linking.openURL(item.url)} activeOpacity={0.9}>
        <Image
          source={{ uri: item.mediaUrl }}
          style={[s.image, { aspectRatio: Math.max(0.6, Math.min(ratio, 2)) }]}
          resizeMode="contain"
          accessibilityLabel={item.caption ?? item.title}
        />
      </TouchableOpacity>
      {item.caption ? <Text style={s.caption}>{item.caption}</Text> : null}
      {item.attribution ? <Text style={s.credit}>{item.attribution}</Text> : null}
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  wrap: { gap: 6 },
  image: { width: '100%', borderRadius: 14, backgroundColor: c.gray100 },
  caption: { fontFamily: FONTS.medium, fontSize: 14, color: c.gray700, lineHeight: 20 },
  credit: { fontFamily: FONTS.regular, fontSize: 11, color: c.gray500 },
}))
