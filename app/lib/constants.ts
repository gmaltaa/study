// lib/constants.ts — espaçamento, tipografia e endereços.

/** Nome do produto. Provisório: trocar aqui e no app.json. */
export const APP_NAME = 'Estudos'

/**
 * Recuo lateral de toda superfície de largura cheia (tela, sheet, rodapé).
 * Não é o respiro interno de card ou pílula, só a distância da borda da tela.
 */
export const GUTTER = 16

export const FONTS = {
  regular: 'HostGrotesk_400Regular',
  medium: 'HostGrotesk_500Medium',
  semiBold: 'HostGrotesk_600SemiBold',
  bold: 'HostGrotesk_700Bold',
  extraBold: 'HostGrotesk_800ExtraBold',
} as const

/**
 * Base da API, SEM barra no fim. Com barra, `${base}${path}` vira `//api/...`,
 * a Vercel responde 308 e o iOS descarta o `Authorization` no redirecionamento:
 * toda rota autenticada passa a dar 401.
 */
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '')

/** Site com termos, privacidade e exclusão de conta. Mesmo backend da API. */
export const SITE_URL = API_BASE_URL
