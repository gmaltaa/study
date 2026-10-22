// components/WheelPicker.tsx — roda de seleção estilo iOS, sem dependência nativa.
import {
  useRef, useState, useEffect } from 'react'
import {
  View, ScrollView, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native'
import { Text } from '@/components/Text'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles } from '@/lib/theme'

export const ITEM_H = 44
const VISIBLE = 5
const PAD = ITEM_H * Math.floor(VISIBLE / 2)

export function WheelPicker<T extends string | number>({
  items,
  value,
  onChange,
  showBand = true,
}: {
  items: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
  showBand?: boolean
}) {
  const s = useStyles()
  const ref = useRef<ScrollView>(null)
  const [center, setCenter] = useState(Math.max(0, items.findIndex((i) => i.value === value)))

  useEffect(() => {
    const idx = items.findIndex((i) => i.value === value)
    if (idx < 0) return
    setCenter(idx)
    const t = setTimeout(() => ref.current?.scrollTo({ y: idx * ITEM_H, animated: false }), 30)
    return () => clearTimeout(t)
  }, [value, items.length])

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H)
    if (idx >= 0 && idx < items.length && idx !== center) setCenter(idx)
  }

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.min(items.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / ITEM_H)))
    onChange(items[idx].value)
  }

  return (
    <View style={{ height: ITEM_H * VISIBLE }}>
      {showBand && <View pointerEvents="none" style={[s.band, { top: PAD }]} />}
      {/* `nestedScrollEnabled`: a roda pode morar DENTRO de outra rolagem
          vertical (o sheet do início do mês rola em tela pequena). Sem ele, no
          Android a rolagem de fora fica com o gesto e a roda não gira. No iOS
          e fora de rolagem, não muda nada. */}
      <ScrollView
        ref={ref}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={onEnd}
        contentContainerStyle={{ paddingVertical: PAD }}
      >
        {items.map((it, i) => (
          <View key={String(it.value)} style={s.item}>
            <Text style={[s.text, i === center ? s.textActive : s.textDim]} numberOfLines={1}>
              {it.label}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  band: {
    position: 'absolute', left: 0, right: 0, height: ITEM_H,
    backgroundColor: c.gray100, borderRadius: 12,
  },
  item: { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  text: { textAlign: 'center' },
  textActive: { fontFamily: FONTS.bold, fontSize: 22, color: c.gray900 },
  textDim: { fontFamily: FONTS.medium, fontSize: 17, color: c.gray500 },
}))
