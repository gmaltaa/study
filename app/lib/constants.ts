// lib/constants.ts — tipografia, medidas e endereços. A régua do app inteiro:
// tela nenhuma escolhe tamanho de fonte, raio ou espaçamento por conta própria.

/** Nome do produto. Provisório: trocar aqui e no app.json. */
export const APP_NAME = 'Estudos'

/**
 * Duas famílias:
 *  - serif (Newsreader): voz do conteúdo. Títulos, saudação, texto das aulas,
 *    cabeçalhos de seção em itálico.
 *  - sans (Inter): voz da interface. Botões, rótulos, linhas de lista, tags.
 */
export const FONTS = {
  serif: 'Newsreader_400Regular',
  serifMedium: 'Newsreader_500Medium',
  serifSemiBold: 'Newsreader_600SemiBold',
  serifItalic: 'Newsreader_400Regular_Italic',
  serifMediumItalic: 'Newsreader_500Medium_Italic',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
} as const

/**
 * Ícones: SEMPRE Phosphor, SEMPRE este peso. Estado (ativo, feito, escolhido)
 * muda a cor, nunca o peso. Os provedores de ícone (raiz do app, Button,
 * IconButton, ListRow, Tag, Chip) aplicam isto: quem usa um ícone não passa
 * `weight`.
 */
export const ICON_WEIGHT = 'bold' as const

/** Recuo lateral de toda superfície de largura cheia (tela, sheet, rodapé). */
export const GUTTER = 20

/** Escala de espaçamento. Fora dela, só com motivo. */
export const SPACE = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const

/**
 * Raios.
 *  - sm: tag, miniatura pequena
 *  - md: botão quadrado contornado, linha de lista contornada, imagem
 *  - lg: campo, card pequeno
 *  - xl: card, lista agrupada
 *  - sheet: topo do bottom sheet
 */
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 22, sheet: 32, pill: 999 } as const

/** Altura dos controles. */
export const CONTROL = { sm: 36, md: 44, lg: 52 } as const

/** Espessura do filete: o "hairline" do iOS fica fino demais no Android. */
export const HAIRLINE = 1

/**
 * Base da API, SEM barra no fim. Com barra, `${base}${path}` vira `//api/...`,
 * a Vercel responde 308 e o iOS descarta o `Authorization` no redirecionamento:
 * toda rota autenticada passa a dar 401.
 */
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '')

/** Site com termos, privacidade e exclusão de conta. Mesmo backend da API. */
export const SITE_URL = API_BASE_URL
