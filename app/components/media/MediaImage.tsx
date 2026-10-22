// components/media/MediaImage.tsx — imagem real (Wikimedia) no meio da aula,
// com legenda e o crédito que a licença exige. Tocar abre a página da imagem.
import { Image, Linking, Pressable, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { RADIUS, SPACE } from '@/lib/constants'
import { useColors } from '@/lib/theme'
import type { MediaItem } from '@/lib/types'

export function MediaImage({ item }: { item: MediaItem }) {
  const c = useColors()
  if (!item.mediaUrl) return null
  const ratio = item.width && item.height ? item.width / item.height : 4 / 3
  return (
    <View style={{ gap: SPACE.sm }}>
      <Pressable onPress={() => Linking.openURL(item.url)} accessibilityRole="imagebutton" accessibilityLabel={item.caption ?? item.title}>
        <Image
          source={{ uri: item.mediaUrl }}
          style={{ width: '100%', aspectRatio: Math.max(0.6, Math.min(ratio, 2)), borderRadius: RADIUS.md, backgroundColor: c.surfaceMuted }}
          resizeMode="cover"
        />
      </Pressable>
      {item.caption ? <Text variant="caption" tone="secondary">{item.caption}</Text> : null}
      {item.attribution ? <Text variant="micro" tone="tertiary">{item.attribution}</Text> : null}
    </View>
  )
}
