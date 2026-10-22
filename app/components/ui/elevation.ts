// components/ui/elevation.ts — as duas sombras do app.
//
// Sombra só em elemento que FLUTUA sobre o conteúdo (botão redondo do topo,
// campo de criar tema, toast). Card comum se separa por filete, não por
// sombra. No escuro sombra não aparece, então o filete assume.
import type { ViewStyle } from 'react-native'
import type { Palette, Scheme } from '@/lib/theme'
import { HAIRLINE } from '@/lib/constants'

export function elevation(level: 'sm' | 'md', c: Palette, scheme: Scheme): ViewStyle {
  if (scheme === 'dark') return { borderWidth: HAIRLINE, borderColor: c.border }
  return level === 'sm'
    ? { shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }
    : { shadowColor: c.shadow, shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 6 }
}
