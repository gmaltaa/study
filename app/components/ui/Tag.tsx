// components/ui/Tag.tsx — etiqueta pequena ("12 min", "Pausado", "em inglês").
//
//   outline  filete fino (metadado neutro, o padrão)
//   muted    cinza quente
//   solid    preto
//   accent / success / danger  estado com significado
import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { IconContext } from 'phosphor-react-native'
import { Text, type TextTone } from '@/components/ui/Text'
import { HAIRLINE, RADIUS, ICON_WEIGHT } from '@/lib/constants'
import { makeThemedStyles, useColors, type Palette } from '@/lib/theme'

export type TagVariant = 'outline' | 'muted' | 'solid' | 'accent' | 'success' | 'danger'

const TONE: Record<TagVariant, { text: TextTone; color: keyof Palette }> = {
  outline: { text: 'secondary', color: 'textSecondary' },
  muted: { text: 'secondary', color: 'textSecondary' },
  solid: { text: 'onPrimary', color: 'onPrimary' },
  accent: { text: 'accent', color: 'accent' },
  success: { text: 'success', color: 'success' },
  danger: { text: 'danger', color: 'danger' },
}

export function Tag({ label, variant = 'outline', icon, style }: {
  label: string
  variant?: TagVariant
  icon?: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const s = useStyles()
  const c = useColors()
  return (
    <View style={[s.base, s[variant], style]}>
      {icon ? <IconContext.Provider value={{ color: c[TONE[variant].color], size: 12, weight: ICON_WEIGHT }}>{icon}</IconContext.Provider> : null}
      <Text variant="micro" tone={TONE[variant].text} numberOfLines={1}>{label}</Text>
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  base: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    height: 24, paddingHorizontal: 9, borderRadius: RADIUS.sm,
  },
  outline: { borderWidth: HAIRLINE, borderColor: c.borderStrong, backgroundColor: c.surface },
  muted: { backgroundColor: c.surfaceMuted },
  solid: { backgroundColor: c.primary },
  accent: { backgroundColor: c.accentSoft },
  success: { backgroundColor: c.successSoft },
  danger: { backgroundColor: c.dangerSoft },
}))
