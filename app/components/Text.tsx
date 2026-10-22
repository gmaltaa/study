// components/Text.tsx — Text/TextInput padrão do app.
// 1) Trava o escalonamento de fonte do SO (allowFontScaling=false) → layout fiel.
// 2) Escala a tipografia de forma responsiva: normaliza pelo "design base" e só
//    REDUZ em telas menores (nunca aumenta). Ajuste BASE_WIDTH / MIN_FACTOR p/ calibrar.
//
// SEMPRE importar Text/TextInput daqui (não de 'react-native') nas telas/componentes.
import { forwardRef } from 'react'
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  Dimensions,
  type TextProps,
  type TextInputProps,
} from 'react-native'

const BASE_WIDTH = 390 // largura de referência do design (px lógicos)
const MIN_FACTOR = 0.85 // não encolher além disso em telas muito estreitas
const { width } = Dimensions.get('window')

/** Fator de escala da fonte: ≤ 1 (telas menores encolhem; maiores ficam em 1). */
export const FONT_FACTOR = Math.max(MIN_FACTOR, Math.min(width / BASE_WIDTH, 1))

function scaleStyle(style: any) {
  const flat = StyleSheet.flatten(style) as any
  if (!flat || typeof flat.fontSize !== 'number') return style
  // Escala só o fontSize (e o lineHeight, se existir) — sem injetar nada.
  const fontSize = Math.round(flat.fontSize * FONT_FACTOR)
  if (typeof flat.lineHeight === 'number') {
    return [style, { fontSize, lineHeight: Math.round(flat.lineHeight * FONT_FACTOR) }]
  }
  return [style, { fontSize }]
}

export const Text = forwardRef<any, TextProps>(({ style, ...props }, ref) => (
  <RNText ref={ref} allowFontScaling={false} style={scaleStyle(style)} {...props} />
))
Text.displayName = 'Text'

export const TextInput = forwardRef<any, TextInputProps>(({ style, ...props }, ref) => (
  <RNTextInput
    ref={ref}
    allowFontScaling={false}
    // Android: centraliza o texto e remove o padding extra da fonte custom que
    // empurrava o placeholder pra cima (parecendo "colado" na borda do input).
    style={[{ textAlignVertical: 'center', includeFontPadding: false }, scaleStyle(style)]}
    {...props}
  />
))
TextInput.displayName = 'TextInput'
