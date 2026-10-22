// lib/media/wikipedia.ts — leituras e imagens reais da Wikipédia em português.
//
// Uma busca devolve os artigos com o resumo e a imagem principal de cada um.
// A imagem principal de um artigo costuma ser muito mais certeira que uma busca
// livre de imagens: o artigo "Capitanias do Brasil" traz o mapa das capitanias.
//
// A licença de cada imagem vem do Commons. Só entram licenças livres que
// permitem uso com crédito (domínio público, CC0, CC BY, CC BY-SA), e o crédito
// vai junto para a tela.
import { clip, getJson, stripHtml } from '@/lib/media/http'
import type { MediaCandidate } from '@/lib/media/types'

const API = 'https://pt.wikipedia.org/w/api.php'
const THUMB_WIDTH = 900
const MIN_IMAGE_WIDTH = 320

interface SearchPage {
  pageid: number
  title: string
  index?: number
  fullurl?: string
  extract?: string
  pageimage?: string
  thumbnail?: { source: string; width: number; height: number }
}

interface ImageInfoPage {
  title: string
  missing?: boolean
  imageinfo?: {
    thumburl?: string
    thumbwidth?: number
    thumbheight?: number
    descriptionurl?: string
    extmetadata?: Record<string, { value?: string }>
  }[]
}

/** Licenças aceitas: livres e que permitem uso com crédito. */
export function acceptableLicense(license: string | null | undefined): boolean {
  if (!license) return false
  const l = license.toLowerCase()
  if (/\bnc\b|non-?commercial|\bnd\b|no-?deriv|fair use|uso restrito/.test(l)) return false
  return /public domain|domínio público|dominio publico|^pd\b|pd-|cc0|cc[ -]by/.test(l)
}

const fileKey = (name: string) => name.replace(/^(ficheiro|arquivo|file|imagem):/i, '').replace(/_/g, ' ').trim()

export async function searchWikipedia(query: string, limit: number): Promise<MediaCandidate[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    gsrsearch: query,
    gsrlimit: String(limit),
    gsrnamespace: '0',
    prop: 'pageimages|extracts|info',
    piprop: 'thumbnail|name',
    pithumbsize: String(THUMB_WIDTH),
    exintro: '1',
    explaintext: '1',
    exsentences: '3',
    exlimit: 'max',
    inprop: 'url',
  })
  const data = await getJson<{ query?: { pages?: SearchPage[] } }>(`${API}?${params}`)
  const pages = (data.query?.pages ?? []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
  if (pages.length === 0) return []

  const out: MediaCandidate[] = pages
    .filter((p) => p.fullurl && p.extract)
    .map((p) => ({
      provider: 'wikipedia',
      kind: 'article',
      externalId: `pt:${p.pageid}`,
      title: p.title,
      author: 'Wikipédia',
      url: p.fullurl!,
      mediaUrl: null,
      thumbnailUrl: p.thumbnail?.source ?? null,
      durationSec: null,
      width: null,
      height: null,
      language: 'pt',
      license: 'CC BY-SA 4.0',
      attribution: 'Wikipédia, a enciclopédia livre',
      description: clip(p.extract, 600),
      publishedAt: null,
    }))

  const images = pages.filter((p) => p.pageimage && p.thumbnail && p.thumbnail.width >= MIN_IMAGE_WIDTH)
  if (images.length === 0) return out
  const info = await getJson<{ query?: { pages?: ImageInfoPage[] } }>(`${API}?${new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    titles: images.map((p) => `Ficheiro:${p.pageimage}`).join('|'),
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: String(THUMB_WIDTH),
    iiextmetadatafilter: 'LicenseShortName|Artist|ImageDescription',
  })}`)
  const byFile = new Map((info.query?.pages ?? []).map((p) => [fileKey(p.title), p]))

  for (const page of images) {
    const meta = byFile.get(fileKey(page.pageimage!))
    const ii = meta?.imageinfo?.[0]
    const ext = ii?.extmetadata ?? {}
    const license = stripHtml(ext.LicenseShortName?.value)
    if (!ii?.thumburl || !acceptableLicense(license)) continue
    const artist = clip(stripHtml(ext.Artist?.value), 120)
    const description = clip(stripHtml(ext.ImageDescription?.value), 300)
    out.push({
      provider: 'wikipedia',
      kind: 'image',
      externalId: `file:${fileKey(page.pageimage!)}`,
      title: description ? clip(description, 140)! : page.title,
      author: artist,
      url: ii.descriptionurl ?? page.fullurl!,
      mediaUrl: ii.thumburl,
      thumbnailUrl: ii.thumburl,
      durationSec: null,
      width: ii.thumbwidth ?? page.thumbnail!.width,
      height: ii.thumbheight ?? page.thumbnail!.height,
      language: null,
      license,
      attribution: [artist, license, 'Wikimedia Commons'].filter(Boolean).join(' · '),
      description: `Imagem principal do artigo "${page.title}"${description ? `: ${description}` : ''}`,
      publishedAt: null,
    })
  }
  return out
}
