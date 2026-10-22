// components/media/VideoPlayer.tsx — vídeo do YouTube dentro da aula.
//
// Começa como miniatura (não carrega o player à toa). Ao tocar, abre a página
// /embed/youtube/:id do backend num WebView: um player carregado de HTML local
// é recusado pelo YouTube, e servido do nosso domínio ele funciona. Qualquer
// link de dentro do player (logo do YouTube, vídeo sugerido) abre fora do app.
import { useState } from 'react'
import { Image, Linking, TouchableOpacity, View } from 'react-native'
import { WebView, type WebViewNavigation } from 'react-native-webview'
import { ArrowSquareOutIcon, PlayIcon } from 'phosphor-react-native'
import { Text } from '@/components/Text'
import { API_BASE_URL, FONTS } from '@/lib/constants'
import { formatDuration } from '@/lib/format'
import { makeThemedStyles, useColors } from '@/lib/theme'
import type { MediaItem } from '@/lib/types'

export function VideoPlayer({ item }: { item: MediaItem }) {
  const s = useStyles()
  const c = useColors()
  const [playing, setPlaying] = useState(false)
  const embed = `${API_BASE_URL}/embed/youtube/${item.mediaUrl}`

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
    <View style={s.wrap}>
      <View style={s.frame}>
        {playing ? (
          <WebView
            source={{ uri: `${embed}?autoplay=1` }}
            style={s.web}
            allowsInlineMediaPlayback
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            onShouldStartLoadWithRequest={onNavigate}
            setSupportMultipleWindows={false}
          />
        ) : (
          <TouchableOpacity style={s.thumbWrap} onPress={play} activeOpacity={0.85} accessibilityLabel={`Assistir: ${item.title}`}>
            {item.thumbnailUrl ? <Image source={{ uri: item.thumbnailUrl }} style={s.thumb} resizeMode="cover" /> : null}
            <View style={s.play}><PlayIcon size={28} color={c.staticWhite} weight="fill" /></View>
            {item.durationSec ? <Text style={s.duration}>{formatDuration(item.durationSec)}</Text> : null}
          </TouchableOpacity>
        )}
      </View>
      <View style={s.meta}>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={2}>{item.title}</Text>
          <Text style={s.author} numberOfLines={1}>
            {item.author ?? 'YouTube'}{item.language?.startsWith('en') ? ' · em inglês' : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={() => Linking.openURL(item.url)} hitSlop={10} accessibilityLabel="Abrir no YouTube">
          <ArrowSquareOutIcon size={20} color={c.gray500} weight="bold" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  wrap: { gap: 8 },
  frame: { width: '100%', aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden', backgroundColor: c.staticBlack },
  web: { flex: 1, backgroundColor: c.staticBlack },
  thumbWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  thumb: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  play: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  duration: {
    position: 'absolute', right: 8, bottom: 8, fontFamily: FONTS.semiBold, fontSize: 12, color: c.staticWhite,
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden',
  },
  meta: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { fontFamily: FONTS.bold, fontSize: 15, color: c.gray900, lineHeight: 20 },
  author: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500, marginTop: 2 },
}))
