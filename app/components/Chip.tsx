// components/Chip.tsx — opção selecionável em pílula, e o grupo de opções.
import type { ReactNode } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { Text } from '@/components/Text'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles } from '@/lib/theme'

export function Chip({ label, selected, onPress, icon }: {
  label: string
  selected: boolean
  onPress: () => void
  icon?: ReactNode
}) {
  const s = useStyles()
  return (
    <TouchableOpacity style={[s.chip, selected && s.chipOn]} onPress={onPress} activeOpacity={0.75}>
      {icon}
      <Text style={[s.label, selected && s.labelOn]}>{label}</Text>
    </TouchableOpacity>
  )
}

/** Escolha única entre opções. */
export function ChipGroup<T extends string | number>({ options, value, onChange }: {
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}) {
  const s = useStyles()
  return (
    <View style={s.group}>
      {options.map((o) => (
        <Chip key={String(o.value)} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  )
}

/** Opção grande, com título e descrição (nível, profundidade, estilo). */
export function OptionCard({ title, description, selected, onPress }: {
  title: string
  description: string
  selected: boolean
  onPress: () => void
}) {
  const s = useStyles()
  return (
    <TouchableOpacity style={[s.option, selected && s.optionOn]} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.radio, selected && s.radioOn]}>{selected ? <View style={s.radioDot} /> : null}</View>
      <View style={{ flex: 1 }}>
        <Text style={s.optionTitle}>{title}</Text>
        <Text style={s.optionDesc}>{description}</Text>
      </View>
    </TouchableOpacity>
  )
}

const useStyles = makeThemedStyles((c) => ({
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
    backgroundColor: c.white, borderWidth: 1.5, borderColor: c.gray200,
  },
  chipOn: { backgroundColor: c.primarySoft, borderColor: c.primary },
  label: { fontFamily: FONTS.semiBold, fontSize: 15, color: c.gray700 },
  labelOn: { color: c.primarySoftText },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 16, backgroundColor: c.white,
    borderWidth: 1.5, borderColor: c.gray200, marginBottom: 10,
  },
  optionOn: { borderColor: c.primary, backgroundColor: c.primarySoft },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.gray300, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: c.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary },
  optionTitle: { fontFamily: FONTS.bold, fontSize: 16, color: c.gray900 },
  optionDesc: { fontFamily: FONTS.regular, fontSize: 14, color: c.gray600, marginTop: 2, lineHeight: 19 },
}))
