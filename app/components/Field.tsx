// components/Field.tsx — campo de texto rotulado. SEMPRE usar este em vez de
// montar TextInput solto. Campo de senha ganha o botão mostrar/ocultar.
import { ReactNode, useState, type Ref } from 'react'
import { View, TouchableOpacity, KeyboardTypeOptions, TextInputProps } from 'react-native'
import { Text, TextInput } from '@/components/Text'
import { Eye, EyeSlash } from 'phosphor-react-native'
import { FONTS } from '@/lib/constants'
import { makeThemedStyles, useColors } from '@/lib/theme'

export function TextField({
  label, hint, value, onChangeText, placeholder, icon, keyboardType, autoFocus, maxLength, onFocus, style,
  secureTextEntry, autoCapitalize, autoComplete, autoCorrect, inputRef, returnKeyType, onSubmitEditing,
  multiline, editable = true,
}: {
  label?: string
  /** Texto de ajuda abaixo do rótulo. */
  hint?: string
  value: string
  onChangeText: (t: string) => void
  placeholder?: string
  icon?: ReactNode
  keyboardType?: KeyboardTypeOptions
  autoFocus?: boolean
  maxLength?: number
  onFocus?: () => void
  style?: object
  secureTextEntry?: boolean
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  autoComplete?: TextInputProps['autoComplete']
  autoCorrect?: boolean
  inputRef?: Ref<any>
  returnKeyType?: TextInputProps['returnKeyType']
  onSubmitEditing?: () => void
  multiline?: boolean
  editable?: boolean
}) {
  const s = useStyles()
  const c = useColors()
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(true)
  const isPassword = !!secureTextEntry
  return (
    <View style={[s.wrap, style]}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
      <View style={[s.box, focused && s.boxFocused, multiline && s.boxMultiline]}>
        {icon}
        <TextInput
          ref={inputRef}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          style={[s.input, multiline && s.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.gray500}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          maxLength={maxLength}
          onFocus={() => { setFocused(true); onFocus?.() }}
          onBlur={() => setFocused(false)}
          secureTextEntry={isPassword && hidden}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={autoCorrect}
          multiline={multiline}
          editable={editable}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setHidden((h) => !h)} hitSlop={10} activeOpacity={0.7}>
            {hidden
              ? <Eye size={22} color={c.gray500} weight="bold" />
              : <EyeSlash size={22} color={c.gray500} weight="bold" />}
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const useStyles = makeThemedStyles((c) => ({
  wrap: { marginBottom: 16 },
  label: { fontFamily: FONTS.bold, fontSize: 14, color: c.gray900, marginBottom: 8 },
  hint: { fontFamily: FONTS.regular, fontSize: 13, color: c.gray500, marginTop: -4, marginBottom: 8, lineHeight: 18 },
  box: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: c.gray200, borderRadius: 12,
    paddingHorizontal: 14, backgroundColor: c.white,
  },
  boxFocused: { borderColor: c.primary },
  boxMultiline: { alignItems: 'flex-start' },
  input: { flex: 1, paddingVertical: 14, fontFamily: FONTS.medium, fontSize: 16, color: c.gray900 },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
}))
