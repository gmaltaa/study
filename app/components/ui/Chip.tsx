// components/ui/Chip.tsx — escolhas.
//
//   Chip       pílula selecionável (selecionada = preta)
//   ChipGroup  escolha única entre pílulas
//   RadioCard  opção grande, com título e descrição (nível, profundidade)
import type { ReactNode } from 'react'
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native'
import { IconContext } from 'phosphor-react-native'
import { Text } from '@/components/ui/Text'
import { HAIRLINE, RADIUS, SPACE, ICON_WEIGHT } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'

export function Chip({ label, selected, onPress, icon, shape = 'pill', accessibilityLabel, style }: {
  label: string
  selected: boolean
  onPress: () => void
  icon?: ReactNode
  /** circle: quadradinho redondo de tamanho fixo (dias da semana). */
  shape?: 'pill' | 'circle'
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
}) {
  const s = useStyles()
  const c = useColors()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [s.chip, shape === 'circle' && s.circle, selected && s.selected, pressed && s.pressed, style]}
    >
      <IconContext.Provider value={{ color: selected ? c.onPrimary : c.text, size: 16, weight: ICON_WEIGHT }}>
        {icon}
        <Text variant="label" tone={selected ? 'onPrimary' : 'primary'}>{label}</Text>
      </IconContext.Provider>
    </Pressable>
  )
}

export function ChipGroup<T extends string | number>({ options, value, onChange }: {
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
      {options.map((o) => (
        <Chip key={String(o.value)} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  )
}

export function RadioCard({ title, description, selected, onPress }: {
  title: string
  description: string
  selected: boolean
  onPress: () => void
}) {
  const s = useStyles()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [s.radioCard, selected && s.radioCardOn, pressed && s.pressed]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="labelStrong">{title}</Text>
        <Text variant="caption" tone="secondary">{description}</Text>
      </View>
      <View style={[s.radio, selected && s.radioOn]}>{selected ? <View style={s.radioDot} /> : null}</View>
    </Pressable>
  )
}

const useStyles = makeThemedStyles((c) => ({
  chip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 40, paddingHorizontal: SPACE.lg, borderRadius: RADIUS.pill,
    backgroundColor: c.surface, borderWidth: HAIRLINE, borderColor: c.borderStrong,
  },
  circle: { width: 44, height: 44, paddingHorizontal: 0, borderRadius: 22 },
  selected: { backgroundColor: c.primary, borderColor: c.primary },
  pressed: { opacity: 0.75 },
  radioCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
    paddingHorizontal: SPACE.lg, paddingVertical: 14, marginBottom: SPACE.sm,
    backgroundColor: c.surface, borderRadius: RADIUS.lg, borderWidth: HAIRLINE, borderColor: c.border,
  },
  radioCardOn: { borderColor: c.primary },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: c.primary, backgroundColor: c.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.onPrimary },
}))
