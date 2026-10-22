// components/ui/Text.tsx — TODO texto do app passa por aqui.
//
// A tipografia é uma escala fechada (`variant`) e a cor é um papel (`tone`).
// Tela nenhuma escolhe fontFamily, fontSize ou cor de texto por conta própria:
// se a escala não tem o que a tela precisa, a escala muda aqui.
//
//   serif (Newsreader) → conteúdo: display, title, heading, subheading, eyebrow, reading, quote, note
//   sans  (Inter)      → interface: body, bodyStrong, label, labelStrong, caption, micro, button
//   mono               → code
import { forwardRef } from 'react'
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native'
import { FONTS } from '@/lib/constants'
import { useColors, type Palette } from '@/lib/theme'

export const TYPE = {
  /** Nome do app na tela de boas-vindas. */
  wordmark: { fontFamily: FONTS.serifSemiBold, fontSize: 44, lineHeight: 50, letterSpacing: -1.2 },
  /** Saudação e capa: o maior texto da tela. */
  display: { fontFamily: FONTS.serif, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  /** Título de tela e de tema. */
  title: { fontFamily: FONTS.serif, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  /** Título de card, de sheet, de seção grande. */
  heading: { fontFamily: FONTS.serif, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  /** Título de linha de destaque (módulo, sessão). */
  subheading: { fontFamily: FONTS.serifMedium, fontSize: 18, lineHeight: 24, letterSpacing: -0.1 },
  /** Cabeçalho de seção, em itálico ("Para hoje", "Aprender"). */
  eyebrow: { fontFamily: FONTS.serifItalic, fontSize: 17, lineHeight: 22 },
  /** Texto corrido das aulas. */
  reading: { fontFamily: FONTS.serif, fontSize: 18, lineHeight: 29 },
  /** Citação e subtítulo dentro da aula. */
  quote: { fontFamily: FONTS.serifItalic, fontSize: 18, lineHeight: 28 },
  /** Comentário curto em itálico (por que este vídeo vale a pena). */
  note: { fontFamily: FONTS.serifItalic, fontSize: 16, lineHeight: 23 },
  /** Código nas aulas de temas técnicos. */
  code: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 14, lineHeight: 21 },

  body: { fontFamily: FONTS.sans, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: FONTS.sansSemiBold, fontSize: 16, lineHeight: 23 },
  /** Linha de lista, campo, opção. */
  label: { fontFamily: FONTS.sansMedium, fontSize: 15, lineHeight: 20 },
  labelStrong: { fontFamily: FONTS.sansSemiBold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: FONTS.sans, fontSize: 13, lineHeight: 18 },
  /** Tag, aba, metadado pequeno. */
  micro: { fontFamily: FONTS.sansMedium, fontSize: 12, lineHeight: 16 },
  button: { fontFamily: FONTS.sansSemiBold, fontSize: 16, lineHeight: 20, letterSpacing: -0.1 },
} satisfies Record<string, TextStyle>

export type TextVariant = keyof typeof TYPE

export type TextTone =
  | 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'onPrimary'
  | 'accent' | 'success' | 'danger' | 'warning' | 'info'

const TONE: Record<TextTone, keyof Palette> = {
  primary: 'text',
  secondary: 'textSecondary',
  tertiary: 'textTertiary',
  inverse: 'textInverse',
  onPrimary: 'onPrimary',
  accent: 'accent',
  success: 'success',
  danger: 'danger',
  warning: 'warning',
  info: 'info',
}

// Telas estreitas (iPhone SE, Androids pequenos) encolhem a tipografia um
// pouco; telas grandes ficam no tamanho de projeto.
const BASE_WIDTH = 390
const FONT_FACTOR = Math.max(0.88, Math.min(Dimensions.get('window').width / BASE_WIDTH, 1))

function scaled(style: TextStyle): TextStyle {
  if (FONT_FACTOR === 1 || typeof style.fontSize !== 'number') return style
  return {
    ...style,
    fontSize: Math.round(style.fontSize * FONT_FACTOR),
    ...(typeof style.lineHeight === 'number' && { lineHeight: Math.round(style.lineHeight * FONT_FACTOR) }),
  }
}

/** Respeita o tamanho de texto do sistema, até um limite que não quebra o layout. */
const MAX_FONT_SCALE = 1.2

export interface TextProps extends RNTextProps {
  variant?: TextVariant
  tone?: TextTone
  align?: TextStyle['textAlign']
  /** Cor fora da paleta de texto (ex.: texto sobre capa colorida). Evite. */
  color?: string
}

export const Text = forwardRef<RNText, TextProps>(
  ({ variant = 'body', tone = 'primary', align, color, style, ...props }, ref) => {
    const c = useColors()
    const base = scaled(TYPE[variant])
    return (
      <RNText
        ref={ref}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        style={[base, { color: color ?? c[TONE[tone]] }, align ? { textAlign: align } : null, style]}
        {...props}
      />
    )
  },
)
Text.displayName = 'Text'

/** Campo de texto cru, já na tipografia do app. Prefira `TextField`. */
export const TextInput = forwardRef<RNTextInput, TextInputProps & { variant?: TextVariant }>(
  ({ variant = 'body', style, ...props }, ref) => {
    const c = useColors()
    return (
      <RNTextInput
        ref={ref}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        placeholderTextColor={c.textTertiary}
        selectionColor={c.primary}
        cursorColor={c.primary}
        // Android: sem o padding extra da fonte, o texto fica centrado no campo.
        style={[scaled(TYPE[variant]), styles.input, { color: c.text }, style]}
        {...props}
      />
    )
  },
)
TextInput.displayName = 'TextInput'

const styles = StyleSheet.create({
  input: { includeFontPadding: false, textAlignVertical: 'center' },
})
