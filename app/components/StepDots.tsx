// components/StepDots.tsx — progresso de um fluxo em passos (onboarding, criar tema).
import { View } from 'react-native'
import { makeThemedStyles } from '@/lib/theme'

export function StepDots({ total, current }: { total: number; current: number }) {
  const s = useStyles()
  return (
    <View style={s.row}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[s.bar, i <= current && s.barOn]} />
      ))}
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  row: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: c.gray200 },
  barOn: { backgroundColor: c.primary },
}))
