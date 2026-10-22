// lib/media/http.ts — chamadas às APIs externas de conteúdo.
//
// Toda chamada tem tempo máximo e identifica o app no User-Agent: a Wikimedia
// exige um User-Agent com contato e bloqueia quem não manda.
import { SITE } from '@/lib/site'

const USER_AGENT = `${SITE.name}/0.1 (${SITE.supportEmail})`
const TIMEOUT_MS = 10_000

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`${new URL(url).host} respondeu ${res.status}`)
  return (await res.json()) as T
}

/** Tira tags e entidades de um trecho de HTML (créditos e descrições da Wikimedia). */
export function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
  return text || null
}

export function clip(text: string | null | undefined, max: number): string | null {
  if (!text) return null
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}
