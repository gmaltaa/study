// components/ui/Divider.tsx — o filete. `inset` recua o começo da linha.
import { View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { HAIRLINE } from '@/lib/constants'
import { useColors } from '@/lib/theme'

export function Divider({ inset = 0, spacing = 0 }: { inset?: number; spacing?: number }) {
  const c = useColors()
  return <View style={{ height: HAIRLINE, backgroundColor: c.border, marginLeft: inset, marginVertical: spacing }} />
}

/** Filete com um rótulo no meio ("ou"). */
export function LabeledDivider({ label }: { label: string }) {
  const c = useColors()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 }}>
      <View style={{ flex: 1, height: HAIRLINE, backgroundColor: c.border }} />
      <Text variant="caption" tone="tertiary">{label}</Text>
      <View style={{ flex: 1, height: HAIRLINE, backgroundColor: c.border }} />
    </View>
  )
}
