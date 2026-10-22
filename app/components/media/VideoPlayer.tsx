// components/media/VideoPlayer.tsx — vídeo do YouTube dentro da aula.
//
// Começa como miniatura (não carrega o player à toa). Ao tocar, abre a página
// /embed/youtube/:id do backend num WebView: um player carregado de HTML local
// é recusado pelo YouTube, e servido do nosso domínio ele funciona. Qualquer
// link de dentro do player (logo do YouTube, vídeo sugerido) abre fora do app.
import { useState } from 'react'
import { Image, Linking, Pressable, View } from 'react-native'
import { WebView, type WebViewNavigation } from 'react-native-webview'
import { ArrowSquareOutIcon, PlayIcon } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { IconButton } from '@/components/ui/IconButton'
import { API_BASE_URL, RADIUS, SPACE } from '@/lib/constants'
import { formatDuration } from '@/lib/format'
import { makeThemedStyles, useColors } from '@/lib/theme'
import type { MediaItem } from '@/lib/types'

export function VideoPlayer({ item }: { item: MediaItem }) {
  const s = useStyles()
  const c = useColors()
  const [playing, setPlaying] = useState(false)

  const play = () => {
    if (!API_BASE_URL || !item.mediaUrl) return void Linking.openURL(item.url)
    setPlaying(true)
  }

  const onNavigate = (req: WebViewNavigation & { isTopFrame?: boolean }) => {
    if (req.isTopFrame === false || req.url.startsWith(`${API_BASE_URL}/embed/`) || req.url === 'about:blank') return true
    Linking.openURL(req.url).catch(() => {})
    return false
  }

  return (
    <View style={{ gap: SPACE.md }}>
      <View style={s.frame}>
        {playing ? (
          <WebView
            source={{ uri: `${API_BASE_URL}/embed/youtube/${item.mediaUrl}?autoplay=1` }}
            style={s.web}
            allowsInlineMediaPlayback
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            onShouldStartLoadWithRequest={onNavigate}
            setSupportMultipleWindows={false}
          />
        ) : (
          <Pressable style={s.thumbWrap} onPress={play} accessibilityRole="button" accessibilityLabel={`Assistir: ${item.title}`}>
            {item.thumbnailUrl ? <Image source={{ uri: item.thumbnailUrl }} style={s.thumb} resizeMode="cover" /> : null}
            <View style={s.play}><PlayIcon size={24} color={c.staticBlack} /></View>
            {item.durationSec ? (
              <View style={s.duration}><Text variant="micro" color={c.staticWhite}>{formatDuration(item.durationSec)}</Text></View>
            ) : null}
          </Pressable>
        )}
      </View>
      <View style={s.meta}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="labelStrong" numberOfLines={2}>{item.title}</Text>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {item.author ?? 'YouTube'}{item.language?.startsWith('en') ? ' · em inglês' : ''}
          </Text>
        </View>
        <IconButton variant="plain" onPress={() => Linking.openURL(item.url)} accessibilityLabel="Abrir no YouTube">
          <ArrowSquareOutIcon />
        </IconButton>
      </View>
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  frame: { width: '100%', aspectRatio: 16 / 9, borderRadius: RADIUS.md, overflow: 'hidden', backgroundColor: c.staticBlack },
  web: { flex: 1, backgroundColor: c.staticBlack },
  thumbWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  thumb: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  play: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  duration: {
    position: 'absolute', right: SPACE.sm, bottom: SPACE.sm, backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  meta: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm },
}))
