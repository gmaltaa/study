// components/ui/Composer.tsx — o campo grande de pedir algo: "O que você quer
// aprender?". Card flutuante, texto em serifa, botão redondo preto de enviar.
import { useState } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { ArrowUpIcon } from 'phosphor-react-native'
import { TextInput } from '@/components/ui/Text'
import { IconButton } from '@/components/ui/IconButton'
import { elevation } from '@/components/ui/elevation'
import { HAIRLINE, RADIUS, SPACE } from '@/lib/constants'
import { makeThemedStyles } from '@/lib/theme'

export function Composer({ value, onChangeText, placeholder, onSubmit, loading = false, autoFocus, maxLength = 600, minHeight = 120, style }: {
  value: string
  onChangeText: (t: string) => void
  placeholder: string
  onSubmit: () => void
  loading?: boolean
  autoFocus?: boolean
  maxLength?: number
  minHeight?: number
  style?: StyleProp<ViewStyle>
}) {
  const s = useStyles()
  const [focused, setFocused] = useState(false)
  const empty = value.trim().length < 2
  return (
    <View style={[s.card, focused && s.cardFocused, style]}>
      <TextInput
        variant="heading"
        style={[s.input, { minHeight }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline
        autoFocus={autoFocus}
        maxLength={maxLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <View style={s.footer}>
        <IconButton variant="solid" size="md" onPress={onSubmit} disabled={empty} loading={loading} accessibilityLabel="Continuar">
          <ArrowUpIcon />
        </IconButton>
      </View>
    </View>
  )
}

const useStyles = makeThemedStyles((c, scheme) => ({
  card: {
    backgroundColor: c.surface, borderRadius: RADIUS.xl, padding: SPACE.lg, paddingBottom: SPACE.md,
    borderWidth: HAIRLINE, borderColor: c.border, ...elevation('md', c, scheme),
  },
  cardFocused: { borderColor: c.borderStrong },
  input: { textAlignVertical: 'top', paddingVertical: 0 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: SPACE.sm },
}))
