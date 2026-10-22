// lib/theme.ts — temas claro e escuro. FONTE ÚNICA de cor do app.
//
// As chaves são SEMÂNTICAS: `white` = superfície de card, `bg` = fundo de tela,
// `gray900` = texto forte, `gray200` = borda. Cada tema dá o seu valor.
//
// Como usar:
//   const useStyles = makeThemedStyles((c) => ({ card: { backgroundColor: c.white } }))
//   const s = useStyles()  e  const c = useColors()  dentro do componente
//
// Tokens que NÃO mudam com o tema: staticWhite / staticBlack.
import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { StyleSheet, useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

// ─── Marca ────────────────────────────────────────────────────────────────────
export const BRAND_HEX = '#0F766E'

const light = {
  primary: BRAND_HEX,
  primaryDark: '#115E59',
  primaryLight: '#CCFBF1',
  primarySoft: '#E6F6F4',
  // Texto e ícone sobre o fundo `primary` (botão primário).
  onPrimary: '#FFFFFF',
  // Texto e ícone sobre `primarySoft`/`primaryLight`.
  primarySoftText: BRAND_HEX,
  primaryBorder: '#99D5CE',

  // Acento quente: sequência de dias, celebração.
  accent: '#F59E0B',
  accentSoft: '#FEF3C7',

  // Fundo escuro de toast e aviso de offline.
  navy: '#0B1F1D',

  white: '#FFFFFF',
  black: '#000000',
  bg: '#F5F7F6',

  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray900: '#111827',

  green: '#10B981',
  greenLight: '#D1FAE5',
  red: '#EF4444',
  redLight: '#FEE2E2',
  yellow: '#F59E0B',
  yellowLight: '#FEF3C7',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',

  staticWhite: '#FFFFFF',
  staticBlack: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
} as const

// Cinza neutro (R=G=B) no escuro; a cor fica por conta da marca e dos status.
// O verde-azulado clareia para ler sobre o fundo escuro, e o texto sobre ele
// vira escuro (branco sobre #2DD4BF não tem contraste).
const dark: Palette = {
  primary: '#2DD4BF',
  primaryDark: '#14B8A6',
  primaryLight: 'rgba(45,212,191,0.20)',
  primarySoft: 'rgba(45,212,191,0.12)',
  onPrimary: '#042F2E',
  primarySoftText: '#5EEAD4',
  primaryBorder: '#1F6F66',

  accent: '#FBBF24',
  accentSoft: 'rgba(251,191,36,0.16)',

  navy: '#383838',

  white: '#1E1E1E',
  black: '#000000',
  bg: '#121212',

  gray50: '#242424',
  gray100: '#2A2A2A',
  gray200: '#333333',
  gray300: '#454545',
  gray500: '#A8A8A8',
  gray600: '#B5B5B5',
  gray700: '#CFCFCF',
  gray900: '#F2F2F2',

  green: '#34D399',
  greenLight: 'rgba(16,185,129,0.16)',
  red: '#F87171',
  redLight: 'rgba(239,68,68,0.16)',
  yellow: '#FBBF24',
  yellowLight: 'rgba(245,158,11,0.16)',
  blue: '#60A5FA',
  blueLight: 'rgba(59,130,246,0.18)',

  staticWhite: '#FFFFFF',
  staticBlack: '#000000',
  overlay: 'rgba(0,0,0,0.65)',
}

export type Palette = { -readonly [K in keyof typeof light]: string }
export type Scheme = 'light' | 'dark'
export type ThemePreference = 'system' | Scheme

export const PALETTES: Record<Scheme, Palette> = { light, dark }

/** Cores dos temas (o card de cada tema). Funcionam nos dois modos. */
export const SUBJECT_COLORS: Record<string, string> = {
  teal: '#0F766E',
  blue: '#2563EB',
  violet: '#7C3AED',
  rose: '#E11D48',
  amber: '#D97706',
  green: '#16A34A',
}

export function subjectColor(key: string | null | undefined): string {
  return SUBJECT_COLORS[key ?? ''] ?? SUBJECT_COLORS.teal
}

// ─── Provider ─────────────────────────────────────────────────────────────────
const PREF_KEY = 'theme_preference'

interface ThemeContextType {
  scheme: Scheme
  colors: Palette
  preference: ThemePreference
  setPreference: (p: ThemePreference) => void
  /** true quando a preferência salva já foi lida (evita piscar no boot). */
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
 *   const useStyles = makeThemedStyles((c) => ({ card: { backgroundColor: c.white } }))
 *   const s = useStyles()
 */
export function makeThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (c: Palette) => T,
): () => T {
  const cache: Partial<Record<Scheme, T>> = {}
  return function useStyles(): T {
    const { scheme, colors } = useTheme()
    const cached = cache[scheme]
    if (cached) return cached
    const created = StyleSheet.create(factory(colors))
    cache[scheme] = created
    return created
  }
}
