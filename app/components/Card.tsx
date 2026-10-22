// components/Card.tsx — superfície de card. Tocável quando recebe `onPress`.
import type { ReactNode } from 'react'
import { TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { makeThemedStyles } from '@/lib/theme'

export function Card({ children, onPress, style }: {
  children: ReactNode
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}) {
  const s = useStyles()
  if (onPress) {
    return (
      <TouchableOpacity style={[s.card, style]} onPress={onPress} activeOpacity={0.8}>
        {children}
      </TouchableOpacity>
    )
  }
  return <View style={[s.card, style]}>{children}</View>
}

const useStyles = makeThemedStyles((c) => ({
  card: { backgroundColor: c.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: c.gray100 },
}))
