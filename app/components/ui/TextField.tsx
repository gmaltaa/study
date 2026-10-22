// components/ui/TextField.tsx — campo de texto com rótulo. SEMPRE este, nunca
// um TextInput solto. Campo de senha ganha o botão de mostrar/ocultar.
import { useState, type Ref } from 'react'
import { Pressable, View, type KeyboardTypeOptions, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native'
import { EyeIcon, EyeSlashIcon } from 'phosphor-react-native'
import { Text, TextInput } from '@/components/ui/Text'
import { CONTROL, HAIRLINE, RADIUS, SPACE } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'

export function TextField({
  label, hint, error, value, onChangeText, placeholder, keyboardType, autoFocus, maxLength, style,
  secureTextEntry, autoCapitalize, autoComplete, autoCorrect, inputRef, returnKeyType, onSubmitEditing, multiline,
}: {
  label?: string
  hint?: string
  error?: string | null
  value: string
  onChangeText: (t: string) => void
  placeholder?: string
  keyboardType?: KeyboardTypeOptions
  autoFocus?: boolean
  maxLength?: number
  style?: StyleProp<ViewStyle>
  secureTextEntry?: boolean
  autoCapitalize?: TextInputProps['autoCapitalize']
  autoComplete?: TextInputProps['autoComplete']
  autoCorrect?: boolean
  inputRef?: Ref<any>
  returnKeyType?: TextInputProps['returnKeyType']
  onSubmitEditing?: () => void
  multiline?: boolean
}) {
  const s = useStyles()
  const c = useColors()
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(true)
  return (
    <View style={[s.wrap, style]}>
      {label ? <Text variant="labelStrong">{label}</Text> : null}
      {hint ? <Text variant="caption" tone="secondary">{hint}</Text> : null}
      <View style={[s.box, multiline && s.boxMultiline, focused && s.boxFocused, !!error && s.boxError]}>
        <TextInput
          ref={inputRef}
          style={[s.input, multiline && s.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          maxLength={maxLength}
          secureTextEntry={!!secureTextEntry && hidden}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'}>
            {hidden ? <EyeIcon size={20} color={c.textTertiary} /> : <EyeSlashIcon size={20} color={c.textTertiary} />}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text variant="caption" tone="danger">{error}</Text> : null}
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  wrap: { gap: SPACE.sm, marginBottom: SPACE.lg },
  box: {
    flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
    minHeight: CONTROL.lg, paddingHorizontal: SPACE.lg,
    backgroundColor: c.surface, borderRadius: RADIUS.lg, borderWidth: HAIRLINE, borderColor: c.borderStrong,
  },
  boxMultiline: { alignItems: 'flex-start', paddingVertical: SPACE.md },
  boxFocused: { borderColor: c.primary },
  boxError: { borderColor: c.danger },
  input: { flex: 1, paddingVertical: 14 },
  inputMultiline: { minHeight: 96, paddingVertical: 0, textAlignVertical: 'top' },
}))
