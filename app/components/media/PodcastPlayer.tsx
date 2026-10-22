// components/media/PodcastPlayer.tsx — episódio de podcast tocado no app, do
// endereço de áudio do próprio programa. O áudio só começa a carregar quando a
// pessoa toca em ouvir. Toca só com o app aberto (sem modo em segundo plano).
import { useRef } from 'react'
import { ActivityIndicator, Image, Linking, TouchableOpacity, View } from 'react-native'
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { ArrowClockwiseIcon, ArrowCounterClockwiseIcon, ArrowSquareOutIcon, HeadphonesIcon, PauseIcon, PlayIcon } from 'phosphor-react-native'
import { Text } from '@/components/Text'
import { ProgressBar } from '@/components/ProgressBar'
import { FONTS } from '@/lib/constants'
import { formatDuration } from '@/lib/format'
import { makeThemedStyles, useColors } from '@/lib/theme'
import type { MediaItem } from '@/lib/types'

export function PodcastPlayer({ item }: { item: MediaItem }) {
  const s = useStyles()
  const c = useColors()
  const player = useAudioPlayer(null)
  const status = useAudioPlayerStatus(player)
  const loaded = useRef(false)
  const total = status.duration || item.durationSec || 0

  const toggle = async () => {
    if (status.playing) return player.pause()
    if (!loaded.current && item.mediaUrl) {
      // Toca mesmo com o iPhone no silencioso: é o que se espera de um podcast.
      await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {})
      player.replace({ uri: item.mediaUrl })
      loaded.current = true
    }
    player.play()
  }

  const skip = (seconds: number) => {
    if (!loaded.current) return
    void player.seekTo(Math.max(0, Math.min(total, status.currentTime + seconds)))
  }

  return (
    <View style={s.card}>
      <View style={s.row}>
        {item.thumbnailUrl
          ? <Image source={{ uri: item.thumbnailUrl }} style={s.art} />
          : <View style={[s.art, s.artEmpty]}><HeadphonesIcon size={24} color={c.gray500} weight="bold" /></View>}
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={2}>{item.title}</Text>
          <Text style={s.author} numberOfLines={1}>
            {item.author ?? 'Podcast'}{item.language?.startsWith('en') ? ' · em inglês' : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={() => Linking.openURL(item.url)} hitSlop={10} accessibilityLabel="Abrir no app de podcasts">
          <ArrowSquareOutIcon size={20} color={c.gray500} weight="bold" />
        </TouchableOpacity>
      </View>
      <View style={s.controls}>
        <TouchableOpacity onPress={() => skip(-15)} hitSlop={8} accessibilityLabel="Voltar 15 segundos">
          <ArrowCounterClockwiseIcon size={22} color={c.gray700} weight="bold" />
        </TouchableOpacity>
        <TouchableOpacity style={s.playBtn} onPress={toggle} activeOpacity={0.85} accessibilityLabel={status.playing ? 'Pausar' : 'Ouvir'}>
          {status.isBuffering && loaded.current
            ? <ActivityIndicator color={c.onPrimary} />
            : status.playing
              ? <PauseIcon size={22} color={c.onPrimary} weight="fill" />
              : <PlayIcon size={22} color={c.onPrimary} weight="fill" />}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => skip(30)} hitSlop={8} accessibilityLabel="Avançar 30 segundos">
          <ArrowClockwiseIcon size={22} color={c.gray700} weight="bold" />
        </TouchableOpacity>
        <View style={{ flex: 1, gap: 4 }}>
          <ProgressBar percent={total ? (status.currentTime / total) * 100 : 0} height={6} />
          <Text style={s.time}>
            {loaded.current ? `${formatDuration(status.currentTime)} / ` : ''}{total ? formatDuration(total) : ''}
          </Text>
        </View>
      </View>
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  card: { backgroundColor: c.white, borderRadius: 16, borderWidth: 1, borderColor: c.gray100, padding: 14, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  art: { width: 56, height: 56, borderRadius: 10, backgroundColor: c.gray100 },
  artEmpty: { alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FONTS.bold, fontSize: 15, color: c.gray900, lineHeight: 20 },
  author: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500, marginTop: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  playBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  time: { fontFamily: FONTS.regular, fontSize: 12, color: c.gray500 },
}))
