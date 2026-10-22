// components/ui/ListRow.tsx — a linha de lista do app. Fonte única.
//
//   outline  linha solta, com filete e cantos (lista de aulas, conteúdos)
//   grouped  dentro de um <ListGroup> (configurações, opções)
//   divided  linha corrida com filete embaixo (sugestões)
//
// À esquerda, um ícone ou uma capa; à direita, um valor, uma tag, um toggle,
// uma seta. O ícone recebe cor e tamanho daqui.
import type { ReactNode } from 'react'
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native'
import { CaretRightIcon, IconContext } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { HAIRLINE, RADIUS, SPACE, ICON_WEIGHT } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'

export type ListRowVariant = 'outline' | 'grouped' | 'divided'

export function ListRow({
  title, subtitle, leading, trailing, value, chevron = false, onPress, variant = 'grouped', destructive = false,
  disabled = false, numberOfLines = 2, style,
}: {
  title: string
  subtitle?: string | null
  leading?: ReactNode
  /** Elemento à direita: Tag, Toggle, botão. */
  trailing?: ReactNode
  /** Texto à direita, discreto ("Automático", "19:00"). */
  value?: string | null
  chevron?: boolean
  onPress?: () => void
  variant?: ListRowVariant
  destructive?: boolean
  disabled?: boolean
  numberOfLines?: number
  style?: StyleProp<ViewStyle>
}) {
  const s = useStyles()
  const c = useColors()
  const content = (
    <IconContext.Provider value={{ color: destructive ? c.danger : c.text, size: 20, weight: ICON_WEIGHT }}>
      {leading ? <View style={s.leading}>{leading}</View> : null}
      <View style={s.texts}>
        <Text variant="label" tone={destructive ? 'danger' : 'primary'} numberOfLines={numberOfLines}>{title}</Text>
        {subtitle ? <Text variant="caption" tone="secondary" numberOfLines={3}>{subtitle}</Text> : null}
      </View>
      {value ? <Text variant="label" tone="tertiary" numberOfLines={1} style={s.value}>{value}</Text> : null}
      {trailing}
      {chevron ? <CaretRightIcon size={16} color={c.textTertiary} /> : null}
    </IconContext.Provider>
  )
  if (!onPress) return <View style={[s.base, s[variant], disabled && s.disabled, style]}>{content}</View>
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [s.base, s[variant], pressed && s.pressed, disabled && s.disabled, style]}
    >
      {content}
    </Pressable>
  )
}

const useStyles = makeThemedStyles((c) => ({
  base: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: 52 },
  outline: {
    backgroundColor: c.surface, borderWidth: HAIRLINE, borderColor: c.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md,
  },
  grouped: { paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md },
  divided: { paddingVertical: SPACE.md, borderBottomWidth: HAIRLINE, borderBottomColor: c.border },
  leading: { alignItems: 'center', justifyContent: 'center', minWidth: 24 },
  texts: { flex: 1, gap: 2 },
  value: { maxWidth: '45%' },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
}))
