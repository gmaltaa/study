// components/ui/Button.tsx — o botão de texto do app. Fonte única.
//
//   primary    preto, a ação principal da tela (uma por tela)
//   secondary  branco com filete, a alternativa ("Já tenho conta")
//   tonal      cinza quente, ação de apoio dentro de card
//   ghost      só texto, saída discreta ("Cancelar", "Pular")
//   danger     texto vermelho sobre fundo suave, ação destrutiva
//
// O ícone recebe cor e tamanho do próprio botão (IconContext): quem chama
// passa só o ícone, sem `color`.
import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native'
import { IconContext } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { CONTROL, HAIRLINE, RADIUS, ICON_WEIGHT } from '@/lib/constants'
import { makeThemedStyles, useColors, type Palette } from '@/lib/theme'

export type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const FG: Record<ButtonVariant, keyof Palette> = {
  primary: 'onPrimary',
  secondary: 'text',
  tonal: 'text',
  ghost: 'text',
  danger: 'danger',
}

export function Button({
  label, onPress, variant = 'primary', size = 'lg', icon, iconRight, loading = false, disabled = false, style,
  accessibilityLabel,
}: {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  /** Ícone antes do texto (sem `color`: o botão pinta). */
  icon?: ReactNode
  /** Ícone depois do texto. */
  iconRight?: ReactNode
  loading?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}) {
  const s = useStyles()
  const c = useColors()
  const off = disabled && !loading
  // Primário desabilitado vira cinza com texto apagado, nos dois temas
  // (opacidade sobre o preto/off-white deixava o rótulo sem contraste no escuro).
  const offPrimary = off && variant === 'primary'
  const fg = offPrimary ? c.textTertiary : c[FG[variant]]
  const iconSize = size === 'sm' ? 16 : 18
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        s.base,
        s[size],
        s[variant],
        pressed && s.pressed,
        offPrimary ? s.primaryDisabled : off && s.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <IconContext.Provider value={{ color: fg, size: iconSize, weight: ICON_WEIGHT }}>
          {icon ? <View>{icon}</View> : null}
          <Text variant="button" color={fg} style={size === 'sm' ? s.smText : null} numberOfLines={1}>{label}</Text>
          {iconRight ? <View>{iconRight}</View> : null}
        </IconContext.Provider>
      )}
    </Pressable>
  )
}

const useStyles = makeThemedStyles((c) => ({
  base: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: RADIUS.pill,
  },
  sm: { height: CONTROL.sm, paddingHorizontal: 14 },
  md: { height: CONTROL.md, paddingHorizontal: 18 },
  lg: { height: CONTROL.lg, paddingHorizontal: 22 },
  smText: { fontSize: 14 },
  primary: { backgroundColor: c.primary },
  primaryDisabled: { backgroundColor: c.surfaceSunken },
  secondary: { backgroundColor: c.surface, borderWidth: HAIRLINE, borderColor: c.borderStrong },
  tonal: { backgroundColor: c.surfaceMuted },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: c.dangerSoft },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.38 },
}))
