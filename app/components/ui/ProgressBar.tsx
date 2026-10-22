// components/ui/ProgressBar.tsx — barra de progresso fina (0 a 100).
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { RADIUS } from '@/lib/constants'
import { useColors } from '@/lib/theme'

export function ProgressBar({ percent, height = 4, color, style }: {
  percent: number
  height?: number
  color?: string
  style?: StyleProp<ViewStyle>
}) {
  const c = useColors()
  const p = Math.max(0, Math.min(100, percent))
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(p) }}
      style={[{ height, borderRadius: RADIUS.pill, backgroundColor: c.surfaceSunken, overflow: 'hidden' }, style]}
    >
      <View style={{ width: `${p}%`, height, borderRadius: RADIUS.pill, backgroundColor: color ?? c.primary }} />
    </View>
  )
}

/** Progresso em passos (onboarding, criar tema): segmentos finos. */
export function StepProgress({ total, current }: { total: number; current: number }) {
  const c = useColors()
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Passo ${current + 1} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= current ? c.primary : c.surfaceSunken }} />
      ))}
    </View>
  )
}
