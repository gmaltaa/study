// components/ui/IconButton.tsx — botão só de ícone. Fonte única.
//
//   outline   quadrado arredondado com filete: navegação (voltar, fechar) e
//             controles de player
//   floating  círculo branco com sombra suave, flutuando sobre o conteúdo
//   solid     círculo preto: a ação de enviar / tocar
//   tonal     círculo cinza quente: ação de apoio
//   plain     só o ícone
//
// O ícone filho recebe cor e tamanho daqui (IconContext): passe o ícone sem
// `color` nem `size`.
import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native'
import { IconContext } from 'phosphor-react-native'
import { elevation } from '@/components/ui/elevation'
import { CONTROL, HAIRLINE, RADIUS, ICON_WEIGHT } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'

export type IconButtonVariant = 'outline' | 'floating' | 'solid' | 'tonal' | 'plain'

const ICON_SIZE = { sm: 18, md: 20, lg: 22 } as const

export function IconButton({
  children, onPress, accessibilityLabel, variant = 'outline', size = 'sm', disabled = false, loading = false, style,
}: {
  children: ReactNode
  onPress: () => void
  /** Obrigatório: botão sem texto precisa de nome para o leitor de tela. */
  accessibilityLabel: string
  variant?: IconButtonVariant
  size?: keyof typeof CONTROL
  disabled?: boolean
  loading?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const s = useStyles()
  const c = useColors()
  // Sólido desabilitado segue o Button primário: cinza com ícone apagado.
  const offSolid = disabled && !loading && variant === 'solid'
  const color = offSolid ? c.textTertiary : variant === 'solid' ? c.onPrimary : c.text
  const dim = CONTROL[size]
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        s.base,
        { width: dim, height: dim, borderRadius: variant === 'outline' ? RADIUS.md : dim / 2 },
        s[variant],
        pressed && s.pressed,
        offSolid ? s.solidDisabled : disabled && s.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <IconContext.Provider value={{ color, size: ICON_SIZE[size], weight: ICON_WEIGHT }}>{children}</IconContext.Provider>
      )}
    </Pressable>
  )
}

const useStyles = makeThemedStyles((c, scheme) => ({
  base: { alignItems: 'center', justifyContent: 'center' },
  outline: { backgroundColor: c.surface, borderWidth: HAIRLINE, borderColor: c.borderStrong },
  floating: { backgroundColor: c.surface, ...elevation('sm', c, scheme) },
  solid: { backgroundColor: c.primary },
  solidDisabled: { backgroundColor: c.surfaceSunken },
  tonal: { backgroundColor: c.surfaceMuted },
  plain: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
}))
