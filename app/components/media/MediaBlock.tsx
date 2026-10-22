// components/media/MediaBlock.tsx — um conteúdo externo completo: o player
// certo para o tipo, o porquê de estar ali e o "ajudou?".
import { useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { ThumbsDownIcon, ThumbsUpIcon } from 'phosphor-react-native'
import { Text } from '@/components/Text'
import { MediaImage } from '@/components/media/MediaImage'
import { VideoPlayer } from '@/components/media/VideoPlayer'
import { PodcastPlayer } from '@/components/media/PodcastPlayer'
import { ReadingCard } from '@/components/media/ReadingCard'
import { api } from '@/lib/api'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'
import type { MediaItem } from '@/lib/types'

export function MediaBlock({ item, showReason = true }: { item: MediaItem; showReason?: boolean }) {
  const s = useStyles()
  const body =
    item.kind === 'video' ? <VideoPlayer item={item} />
    : item.kind === 'podcast' ? <PodcastPlayer item={item} />
    : item.kind === 'article' ? <ReadingCard item={item} />
    : <MediaImage item={item} />
  // Imagem não leva "ajudou?": é ilustração do texto, não um conteúdo à parte.
  const rateable = item.kind !== 'image'
  return (
    <View style={s.wrap}>
      {showReason && item.reason && item.kind !== 'image' ? <Text style={s.reason}>{item.reason}</Text> : null}
      {body}
      {rateable ? <Feedback item={item} /> : null}
    </View>
  )
}

function Feedback({ item }: { item: MediaItem }) {
  const s = useStyles()
  const c = useColors()
  const [value, setValue] = useState(item.feedback)
  const send = (helpful: boolean) => {
    setValue(helpful ? 'helpful' : 'not_helpful')
    api.mediaFeedback(item.id, helpful).catch(() => setValue(item.feedback))
  }
  return (
    <View style={s.feedback}>
      <Text style={s.feedbackText}>{value ? 'Obrigado pela resposta' : 'Ajudou?'}</Text>
      <TouchableOpacity onPress={() => send(true)} hitSlop={8} accessibilityLabel="Ajudou">
        <ThumbsUpIcon size={18} color={value === 'helpful' ? c.primary : c.gray500} weight={value === 'helpful' ? 'fill' : 'regular'} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => send(false)} hitSlop={8} accessibilityLabel="Não ajudou">
        <ThumbsDownIcon size={18} color={value === 'not_helpful' ? c.red : c.gray500} weight={value === 'not_helpful' ? 'fill' : 'regular'} />
      </TouchableOpacity>
    </View>
  )
}

/** "Para ir além": os extras da aula (vídeo, podcast, leitura), fora do tempo dela. */
export function MediaExtras({ items }: { items: MediaItem[] }) {
  const s = useStyles()
  if (items.length === 0) return null
  return (
    <View style={s.extras}>
      <Text style={s.extrasTitle}>Para ir além</Text>
      <Text style={s.extrasHint}>Opcional. Não conta no tempo da aula.</Text>
      {items.map((m) => <MediaBlock key={m.id} item={m} />)}
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  wrap: { gap: 8 },
  reason: { fontFamily: FONTS.medium, fontSize: 14, color: c.gray600, lineHeight: 20 },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: 14, justifyContent: 'flex-end' },
  feedbackText: { fontFamily: FONTS.regular, fontSize: 12, color: c.gray500 },
  extras: { gap: 16, marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: c.gray100 },
  extrasTitle: { fontFamily: FONTS.extraBold, fontSize: 20, color: c.gray900 },
  extrasHint: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500, marginTop: -10 },
}))
