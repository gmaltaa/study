// components/media/PodcastPlayer.tsx — episódio de podcast tocado no app, do
// endereço de áudio do próprio programa. O áudio só começa a carregar quando a
// pessoa toca em ouvir. Toca só com o app aberto (sem modo em segundo plano).
import { useRef } from 'react'
import { Image, Linking, View } from 'react-native'
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import {
  ArrowClockwiseIcon, ArrowCounterClockwiseIcon, ArrowSquareOutIcon, HeadphonesIcon, PauseIcon, PlayIcon,
} from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { IconButton } from '@/components/ui/IconButton'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { HAIRLINE, RADIUS, SPACE } from '@/lib/constants'
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
      <ProgressBar percent={total ? (status.currentTime / total) * 100 : 0} height={2} style={s.progress} />
      <View style={s.row}>
        {item.thumbnailUrl
          ? <Image source={{ uri: item.thumbnailUrl }} style={s.art} />
          : <View style={[s.art, s.artEmpty]}><HeadphonesIcon size={22} color={c.textSecondary} /></View>}
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="labelStrong" numberOfLines={2}>{item.title}</Text>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {item.author ?? 'Podcast'}{item.language?.startsWith('en') ? ' · em inglês' : ''}
          </Text>
        </View>
      </View>
      <View style={s.controls}>
        <IconButton onPress={() => skip(-15)} accessibilityLabel="Voltar 15 segundos" disabled={!loaded.current}>
          <ArrowCounterClockwiseIcon />
        </IconButton>
        <IconButton
          variant="solid"
          size="md"
          onPress={toggle}
          loading={status.isBuffering && loaded.current && !status.playing}
          accessibilityLabel={status.playing ? 'Pausar' : 'Ouvir'}
        >
          {status.playing ? <PauseIcon /> : <PlayIcon />}
        </IconButton>
        <IconButton onPress={() => skip(30)} accessibilityLabel="Avançar 30 segundos" disabled={!loaded.current}>
          <ArrowClockwiseIcon />
        </IconButton>
        <Text variant="micro" tone="secondary" style={{ flex: 1, textAlign: 'right' }}>
          {loaded.current ? `${formatDuration(status.currentTime)} / ` : ''}{total ? formatDuration(total) : ''}
        </Text>
        <IconButton onPress={() => Linking.openURL(item.url)} accessibilityLabel="Abrir no app de podcasts">
          <ArrowSquareOutIcon />
        </IconButton>
      </View>
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  card: {
    backgroundColor: c.surface, borderRadius: RADIUS.xl, borderWidth: HAIRLINE, borderColor: c.border,
    padding: SPACE.lg, paddingTop: SPACE.lg + 2, gap: SPACE.lg, overflow: 'hidden',
  },
  progress: { position: 'absolute', top: 0, left: 0, right: 0, borderRadius: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  art: { width: 48, height: 48, borderRadius: RADIUS.sm, backgroundColor: c.surfaceMuted },
  artEmpty: { alignItems: 'center', justifyContent: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
}))
