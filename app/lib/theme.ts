// lib/theme.ts — cores do app, claro e escuro. FONTE ÚNICA de cor.
//
// Linguagem visual: fundo off-white quente, superfícies brancas separadas por
// filetes finos, cinza quente nos agrupamentos e preto como cor de ação. Nada
// de cor de marca saturada: a cor aparece só onde carrega significado (acerto,
// erro, sequência de dias).
//
// As chaves são SEMÂNTICAS (o papel, não o tom): `surface` é a superfície de
// card, `surfaceMuted` o fundo de lista agrupada e pílula tonal, `primary` a
// ação principal. Cada tema dá o seu valor. No escuro, o "preto" da ação vira
// off-white, para continuar sendo o elemento de maior contraste da tela.
//
// Uso:
//   const useStyles = makeThemedStyles((c) => ({ card: { backgroundColor: c.surface } }))
//   const s = useStyles()  e  const c = useColors()  dentro do componente
import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { StyleSheet, useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const light = {
  /** Fundo de tela. */
  bg: '#F8F7F4',
  /** Card, sheet, campo de destaque. */
  surface: '#FFFFFF',
  /** Lista agrupada, pílula tonal, botão secundário cheio. */
  surfaceMuted: '#F0EEE9',
  /** Trilho de progresso, estado pressionado. */
  surfaceSunken: '#E7E4DD',

  /** Filete padrão. */
  border: '#E6E3DC',
  /** Filete de controle (botão contornado, campo). */
  borderStrong: '#D6D2C9',

  text: '#1A1917',
  textSecondary: '#5E5B54',
  textTertiary: '#9A968D',
  textInverse: '#FFFFFF',

  /** Ação principal: botão, seleção, progresso. */
  primary: '#1A1917',
  onPrimary: '#FFFFFF',

  /** Acento quente, só para a sequência de dias e celebração. */
  accent: '#C4633F',
  accentSoft: '#F5E5DC',

  success: '#2F7A4D',
  successSoft: '#E4F0E7',
  danger: '#B2392D',
  dangerSoft: '#F7E3E0',
  warning: '#8E6413',
  warningSoft: '#F4EAD3',
  info: '#38597F',
  infoSoft: '#E4EAF1',

  overlay: 'rgba(26,25,23,0.38)',
  shadow: '#1A1917',
  staticWhite: '#FFFFFF',
  staticBlack: '#000000',
} as const

const dark: Palette = {
  bg: '#1B1A18',
  surface: '#252422',
  surfaceMuted: '#2E2D2A',
  surfaceSunken: '#3A3835',

  border: '#33322F',
  borderStrong: '#47453F',

  text: '#F3F1EC',
  textSecondary: '#B3AFA6',
  textTertiary: '#7F7B73',
  textInverse: '#1A1917',

  primary: '#F3F1EC',
  onPrimary: '#1A1917',

  accent: '#E08B67',
  accentSoft: 'rgba(224,139,103,0.16)',

  success: '#6FBF8C',
  successSoft: 'rgba(111,191,140,0.14)',
  danger: '#EE7E70',
  dangerSoft: 'rgba(238,126,112,0.15)',
  warning: '#E0B65E',
  warningSoft: 'rgba(224,182,94,0.14)',
  info: '#93B4DA',
  infoSoft: 'rgba(147,180,218,0.14)',

  overlay: 'rgba(0,0,0,0.6)',
  shadow: '#000000',
  staticWhite: '#FFFFFF',
  staticBlack: '#000000',
}

export type Palette = { -readonly [K in keyof typeof light]: string }
export type Scheme = 'light' | 'dark'
export type ThemePreference = 'system' | Scheme

export const PALETTES: Record<Scheme, Palette> = { light, dark }

/** Fundo da splash nativa e do ícone (fixos, não acompanham o tema). */
export const SPLASH_BG = light.bg

/**
 * Tons das capas de tema (o quadrado com o emoji). Quentes e dessaturados, para
 * conviver com o resto sem virar cor de marca. A chave vem do backend
 * (`subjects.color`); chave desconhecida cai em `stone`.
 */
const COVER_TINTS: Record<string, { light: string; dark: string }> = {
  stone: { light: '#ECE8E1', dark: '#34322E' },
  clay: { light: '#F2E3DA', dark: '#3D302A' },
  sky: { light: '#E0E7EE', dark: '#2B323A' },
  lilac: { light: '#E8E3EF', dark: '#332F3A' },
  rose: { light: '#F1E1E4', dark: '#3A2E31' },
  sand: { light: '#F1E9D7', dark: '#38332A' },
}

export function coverTint(key: string | null | undefined, scheme: Scheme): string {
  return (COVER_TINTS[key ?? ''] ?? COVER_TINTS.stone)[scheme]
}

// ─── Provider ─────────────────────────────────────────────────────────────────
const PREF_KEY = 'theme_preference'

interface ThemeContextType {
  scheme: Scheme
  colors: Palette
  preference: ThemePreference
  setPreference: (p: ThemePreference) => void
  /** A preferência salva já foi lida (evita piscar no boot). */
  ready: boolean
}

const ThemeContext = createContext<ThemeContextType>({
  scheme: 'light',
  colors: light,
  preference: 'system',
  setPreference: () => {},
  ready: false,
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  const [preference, setPreferenceState] = useState<ThemePreference>('system')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(PREF_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPreferenceState(v)
      })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p)
    AsyncStorage.setItem(PREF_KEY, p).catch(() => {})
  }

  const scheme: Scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference

  const value = useMemo<ThemeContextType>(
    () => ({ scheme, colors: PALETTES[scheme], preference, setPreference, ready }),
    [scheme, preference, ready],
  )

  return createElement(ThemeContext.Provider, { value }, children)
}

/** Paleta do tema atual, para cores inline (ícones, props color). */
export function useColors(): Palette {
  return useTheme().colors
}

/**
 * Estilos temáticos com cache por tema: o factory roda UMA vez por tema.
 *
 *   const useStyles = makeThemedStyles((c, scheme) => ({ card: { backgroundColor: c.surface } }))
 *   const s = useStyles()
 */
export function makeThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (c: Palette, scheme: Scheme) => T,
): () => T {
  const cache: Partial<Record<Scheme, T>> = {}
  return function useStyles(): T {
    const { scheme, colors } = useTheme()
    const cached = cache[scheme]
    if (cached) return cached
    const created = StyleSheet.create(factory(colors, scheme))
    cache[scheme] = created
    return created
  }
}
