// components/Button.tsx — botão padrão do produto. Fonte única.
// Pílula, padding vertical 15, fonte 16. Use style={{ flex: 1 }} para pares lado a lado.
import { ReactNode, cloneElement, isValidElement } from 'react'
import { ActivityIndicator, TouchableOpacity, ViewStyle } from 'react-native'
import { Text } from '@/components/Text'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'

// `ghost` = só texto (ação secundária).
// `ghostMuted` = ghost em cinza claro, para a saída que não queremos incentivar.
// `ghostDanger` = ghost em vermelho, para a saída destrutiva que não deve competir
// com a ação principal.
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'ghostMuted' | 'ghostDanger'

export function Button({
  label, onPress, variant = 'primary', loading = false, disabled = false, style, icon,
}: {
  label: string
  onPress: () => void
  variant?: Variant
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle | ViewStyle[]
  icon?: ReactNode
}) {
  const s = useStyles()
  const c = useColors()
  const ghost = variant === 'ghost' || variant === 'ghostMuted' || variant === 'ghostDanger'
  const bg = variant === 'danger' ? s.danger : variant === 'secondary' ? s.secondary : ghost ? s.ghost : s.primary
  const textStyle =
    variant === 'secondary' ? s.secondaryText
    : variant === 'danger' ? s.dangerText
    : variant === 'ghostMuted' ? s.ghostMutedText
    : variant === 'ghostDanger' ? s.ghostDangerText
    : variant === 'ghost' ? s.ghostText
    : s.primaryText
  const spinnerColor =
    variant === 'secondary' ? c.primarySoftText
    : variant === 'ghostDanger' ? c.red
    : ghost ? c.gray600
    : variant === 'danger' ? c.staticWhite
    : c.onPrimary
  // Desabilitado (sem loading) = pílula cinza com texto cinza.
  // Loading mantém a cor da variante com opacidade (o spinner comunica o estado).
  const isDisabledLook = disabled && !loading && !ghost
  // No secondary, o ícone tem a cor do texto, decidida aqui: assim nenhuma tela
  // precisa lembrar de pintar o ícone igual ao texto em cada tema.
  const iconInButton = variant === 'secondary' && !isDisabledLook && isValidElement<{ color?: string }>(icon)
    ? cloneElement(icon, { color: c.primarySoftText })
    : icon
  return (
    <TouchableOpacity
      style={[s.base, bg, loading && s.loading, isDisabledLook && s.disabled, disabled && !isDisabledLook && s.loading, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <>
          {iconInButton}
          <Text style={[textStyle, isDisabledLook && s.disabledText]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  )
}

const useStyles = makeThemedStyles((c) => ({
  base: { borderRadius: 999, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primary: { backgroundColor: c.primary },
  secondary: { backgroundColor: c.primarySoft },
  danger: { backgroundColor: c.red },
  ghost: { backgroundColor: 'transparent' },
  disabled: { backgroundColor: c.gray200 },
  disabledText: { color: c.gray500 },
  loading: { opacity: 0.6 },
  primaryText: { fontFamily: FONTS.bold, fontSize: 16, color: c.onPrimary },
  secondaryText: { fontFamily: FONTS.bold, fontSize: 16, color: c.primarySoftText },
  dangerText: { fontFamily: FONTS.bold, fontSize: 16, color: c.staticWhite },
  ghostText: { fontFamily: FONTS.bold, fontSize: 16, color: c.gray900 },
  ghostMutedText: { fontFamily: FONTS.bold, fontSize: 16, color: c.gray500 },
  ghostDangerText: { fontFamily: FONTS.bold, fontSize: 16, color: c.red },
}))
