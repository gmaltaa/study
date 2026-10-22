// components/ProgressBar.tsx — barra de progresso (0 a 100).
import { View } from 'react-native'
import { makeThemedStyles, useColors } from '@/lib/theme'

export function ProgressBar({ percent, color, height = 8 }: { percent: number; color?: string; height?: number }) {
  const s = useStyles()
  const c = useColors()
  const p = Math.max(0, Math.min(100, percent))
  return (
    <View style={[s.track, { height, borderRadius: height / 2 }]}>
      <View style={{ width: `${p}%`, height, borderRadius: height / 2, backgroundColor: color ?? c.primary }} />
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  track: { backgroundColor: c.gray100, overflow: 'hidden', width: '100%' },
}))
