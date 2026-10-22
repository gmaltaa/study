// components/ui/Cover.tsx — a capa de um tema: o emoji sobre um tom quente e
// dessaturado (lib/theme → coverTint). Quadrado de cantos suaves, como capa.
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { Text } from '@/components/ui/Text'
import { coverTint, useTheme } from '@/lib/theme'

export function Cover({ icon, color, size = 48, style }: {
  icon: string
  color: string | null | undefined
  size?: number
  style?: StyleProp<ViewStyle>
}) {
  const { scheme } = useTheme()
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[{
        width: size, height: size, borderRadius: Math.round(size * 0.24),
        backgroundColor: coverTint(color, scheme), alignItems: 'center', justifyContent: 'center',
      }, style]}
    >
      <Text style={{ fontSize: Math.round(size * 0.46), lineHeight: Math.round(size * 0.6) }}>{icon}</Text>
    </View>
  )
}
