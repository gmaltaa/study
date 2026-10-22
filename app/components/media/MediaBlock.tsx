// components/media/MediaBlock.tsx — um conteúdo externo completo: o player
// certo para o tipo, o porquê de estar ali e o "ajudou?".
import { useState } from 'react'
import { View } from 'react-native'
import { ThumbsDownIcon, ThumbsUpIcon } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { IconButton } from '@/components/ui/IconButton'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { MediaImage } from '@/components/media/MediaImage'
import { VideoPlayer } from '@/components/media/VideoPlayer'
import { PodcastPlayer } from '@/components/media/PodcastPlayer'
import { ReadingCard } from '@/components/media/ReadingCard'
import { api } from '@/lib/api'
import { SPACE } from '@/lib/constants'
import { useColors } from '@/lib/theme'
import type { MediaItem } from '@/lib/types'

export function MediaBlock({ item }: { item: MediaItem }) {
  const body =
    item.kind === 'video' ? <VideoPlayer item={item} />
    : item.kind === 'podcast' ? <PodcastPlayer item={item} />
    : item.kind === 'article' ? <ReadingCard item={item} />
    : <MediaImage item={item} />
  // Imagem não leva motivo nem "ajudou?": ilustra o texto, não é um conteúdo à parte.
  const standalone = item.kind !== 'image'
  return (
    <View style={{ gap: SPACE.sm }}>
      {standalone && item.reason ? <Text variant="note" tone="secondary">{item.reason}</Text> : null}
      {body}
      {standalone ? <Feedback item={item} /> : null}
    </View>
  )
}

function Feedback({ item }: { item: MediaItem }) {
  const c = useColors()
  const [value, setValue] = useState(item.feedback)
  const send = (helpful: boolean) => {
    setValue(helpful ? 'helpful' : 'not_helpful')
    api.mediaFeedback(item.id, helpful).catch(() => setValue(item.feedback))
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: SPACE.xs }}>
      <Text variant="micro" tone="tertiary" style={{ marginRight: SPACE.xs }}>{value ? 'Obrigado' : 'Ajudou?'}</Text>
      <IconButton variant="plain" onPress={() => send(true)} accessibilityLabel="Ajudou">
        <ThumbsUpIcon color={value === 'helpful' ? c.text : c.textTertiary} />
      </IconButton>
      <IconButton variant="plain" onPress={() => send(false)} accessibilityLabel="Não ajudou">
        <ThumbsDownIcon color={value === 'not_helpful' ? c.text : c.textTertiary} />
      </IconButton>
    </View>
  )
}

/** "Para ir além": os extras da aula (vídeo, podcast, leitura), fora do tempo dela. */
export function MediaExtras({ items }: { items: MediaItem[] }) {
  if (items.length === 0) return null
  return (
    <View>
      <SectionHeader title="Para ir além" description="Opcional. Não conta no tempo da aula." style={{ marginTop: SPACE.xxxl }} />
      <View style={{ gap: SPACE.xl }}>
        {items.map((m) => <MediaBlock key={m.id} item={m} />)}
      </View>
    </View>
  )
}
