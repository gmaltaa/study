// components/ui/Card.tsx — superfície de card. Tocável quando recebe `onPress`.
//
//   outline   branco com filete (o padrão: separa por linha, não por sombra)
//   muted     cinza quente, sem filete (bloco de apoio dentro de outra superfície)
//   elevated  branco com sombra suave: só para o que flutua (campo de criar tema)
import type { ReactNode } from 'react'
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native'
import { elevation } from '@/components/ui/elevation'
import { HAIRLINE, RADIUS, SPACE } from '@/lib/constants'
import { makeThemedStyles } from '@/lib/theme'

export type CardVariant = 'outline' | 'muted' | 'elevated'

export function Card({ children, variant = 'outline', onPress, padding = SPACE.lg, style, accessibilityLabel }: {
  children: ReactNode
  variant?: CardVariant
  onPress?: () => void
  padding?: number
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}) {
  const s = useStyles()
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [s.base, s[variant], { padding }, pressed && s.pressed, style]}
      >
        {children}
      </Pressable>
    )
  }
  return <View style={[s.base, s[variant], { padding }, style]}>{children}</View>
}

const useStyles = makeThemedStyles((c, scheme) => ({
  base: { borderRadius: RADIUS.xl },
  outline: { backgroundColor: c.surface, borderWidth: HAIRLINE, borderColor: c.border },
  muted: { backgroundColor: c.surfaceMuted },
  elevated: { backgroundColor: c.surface, borderWidth: HAIRLINE, borderColor: c.border, ...elevation('md', c, scheme) },
  pressed: { opacity: 0.85 },
}))
