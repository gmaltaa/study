// lib/ai/validate.ts — o que o código garante sobre a saída da IA.
//
// O modelo recebe as regras no prompt, mas a garantia vem daqui. Dois tipos de
// tratamento:
//  - CORRIGIR o que é seguro corrigir: minutos fora da faixa, soma acima do
//    orçamento, texto com espaço sobrando. Como o conteúdo de cada aula só é
//    gerado depois, mexer nos minutos da estrutura não perde nada: a aula nasce
//    no tamanho novo.
//  - RECUSAR (OutputError) o que não dá para consertar: trilha vazia, exercício
//    sem alternativa certa. Quem chama tenta de novo com o erro no prompt.
import { LESSON_MIN_MINUTES } from '@/lib/schedule'
import type {
  Block, LessonContent, ModuleLessons, PathModules, StoredExercise, StoredOption,
} from '@/lib/ai/schemas'

export class OutputError extends Error {}

export const MAX_MODULES = 15
const MAX_OBJECTIVES = 4
const MAX_CONCEPTS = 6

const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()
const cleanList = (xs: string[] | null | undefined, max: number) =>
  (xs ?? []).map(clean).filter(Boolean).slice(0, max)

/**
 * Reduz os valores, na proporção, até a soma caber no teto. Nenhum fica abaixo
 * do mínimo. Supõe `values.length * min <= cap` (quem chama garante).
 */
export function scaleToFit(values: number[], cap: number, min: number): number[] {
  const sum = values.reduce((a, b) => a + b, 0)
  if (sum <= cap) return values
  const factor = cap / sum
  const out = values.map((v) => Math.max(min, Math.floor(v * factor)))
  let total = out.reduce((a, b) => a + b, 0)
  while (total > cap) {
    let idx = -1
    for (let i = 0; i < out.length; i++) if (out[i] > min && (idx < 0 || out[i] > out[idx])) idx = i
    if (idx < 0) break
    out[idx]--
    total--
  }
  return out
}

export interface FittedModule {
  title: string
  objective: string
  builds_on: string | null
  minutes: number
}

/** Módulos dentro do orçamento: cada um cabe ao menos uma aula mínima. */
export function fitModules(raw: PathModules, budget: number): FittedModule[] {
  let modules = raw.modules
    .map((m) => ({
      title: clean(m.title),
      objective: clean(m.objective),
      builds_on: clean(m.builds_on) || null,
      minutes: Math.max(LESSON_MIN_MINUTES, Math.round(Number(m.minutes) || 0)),
    }))
    .filter((m) => m.title && m.objective)
    .slice(0, MAX_MODULES)
  if (modules.length === 0) throw new OutputError('A trilha veio sem nenhum módulo válido.')
  // Orçamento minúsculo (prazo muito curto): ficam os primeiros módulos.
  const fit = Math.max(1, Math.floor(budget / LESSON_MIN_MINUTES))
  modules = modules.slice(0, fit)
  const minutes = scaleToFit(modules.map((m) => m.minutes), budget, LESSON_MIN_MINUTES)
  return modules.map((m, i) => ({ ...m, builds_on: i === 0 ? null : m.builds_on, minutes: minutes[i] }))
}

export interface FittedLesson {
  title: string
  objectives: string[]
  key_concepts: string[]
  minutes: number
}

/** Aulas de um módulo: cada uma entre o mínimo e `lessonMax`, somando no
 *  máximo o orçamento do módulo. */
export function fitLessons(raw: ModuleLessons, moduleBudget: number, lessonMax: number): FittedLesson[] {
  let lessons = raw.lessons
    .map((l) => ({
      title: clean(l.title),
      objectives: cleanList(l.objectives, MAX_OBJECTIVES),
      key_concepts: cleanList(l.key_concepts, MAX_CONCEPTS),
      minutes: Math.min(lessonMax, Math.max(LESSON_MIN_MINUTES, Math.round(Number(l.minutes) || 0))),
    }))
    .filter((l) => l.title)
  if (lessons.length === 0) throw new OutputError('O módulo veio sem nenhuma aula válida.')
  lessons = lessons.slice(0, Math.max(1, Math.floor(moduleBudget / LESSON_MIN_MINUTES)))
  const minutes = scaleToFit(lessons.map((l) => l.minutes), moduleBudget, LESSON_MIN_MINUTES)
  return lessons.map((l, i) => ({ ...l, minutes: minutes[i] }))
}

// ─── Conteúdo da aula ──────────────────────────────────────────────────────

/** Leitura atenta de texto didático, em palavras por minuto. */
export const READING_WPM = 150

/** Exercícios por aula: ~1 a cada 4 minutos, entre 2 e 6. */
export function exerciseCountFor(minutes: number): number {
  return Math.min(6, Math.max(2, Math.round(minutes / 4)))
}

/**
 * Palavras de leitura que cabem na aula, descontados ~1 min por exercício e os
 * minutos do vídeo principal (que conta no tempo da aula).
 */
export function wordTargetFor(minutes: number, mediaMinutes = 0): number {
  return Math.max(150, (minutes - mediaMinutes - exerciseCountFor(minutes)) * READING_WPM)
}

function toBlock(b: LessonContent['blocks'][number], mediaRefs: Set<string>): Block | null {
  const text = (b.text ?? '').trim()
  const title = clean(b.title) || null
  const items = cleanList(b.items, 12)
  switch (b.type) {
    // Só referências de mídia que existem nesta aula, cada uma uma vez.
    case 'media': {
      const ref = clean(b.text)
      if (!mediaRefs.has(ref)) return null
      mediaRefs.delete(ref)
      return { type: 'media', ref }
    }
    case 'heading': return clean(text) ? { type: 'heading', text: clean(text) } : null
    case 'paragraph': return text ? { type: 'paragraph', text } : null
    case 'quote': return text ? { type: 'quote', text } : null
    case 'list': return items.length ? { type: 'list', items } : null
    case 'key_points': return items.length ? { type: 'key_points', title, items } : null
    case 'example': return text ? { type: 'example', title, text } : null
    case 'callout': return text ? { type: 'callout', title, text } : null
    // Código mantém a indentação: só tira linhas vazias das pontas.
    case 'code': return b.text?.trim() ? { type: 'code', language: clean(b.language) || null, text: b.text.replace(/^\n+|\s+$/g, '') } : null
    default: return null
  }
}

const OPTION_IDS = ['a', 'b', 'c', 'd', 'e']

function shuffle<T>(xs: T[], random: () => number): T[] {
  const out = [...xs]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function toExercise(
  e: LessonContent['exercises'][number], random: () => number,
): Omit<StoredExercise, 'position'> | null {
  const prompt = clean(e.prompt)
  const options = e.options
    .map((o) => ({ text: clean(o.text), explanation: clean(o.explanation), correct: o.correct === true }))
    .filter((o) => o.text && o.explanation)
  if (!prompt) return null
  if (options.filter((o) => o.correct).length !== 1) return null
  if (e.kind === 'true_false') {
    if (options.length !== 2) return null
  } else if (options.length < 3 || options.length > 5) {
    return null
  }
  if (new Set(options.map((o) => o.text.toLowerCase())).size !== options.length) return null
  // Modelos tendem a pôr a alternativa certa nas primeiras posições. Embaralhar
  // aqui tira o padrão. Verdadeiro/falso fica na ordem natural.
  const ordered = e.kind === 'true_false'
    ? [...options].sort((a, b) => (/^verdadeir/i.test(a.text) ? -1 : /^verdadeir/i.test(b.text) ? 1 : 0))
    : shuffle(options, random)
  const stored: StoredOption[] = ordered.map((o, i) => ({ id: OPTION_IDS[i], text: o.text, explanation: o.explanation }))
  return {
    kind: e.kind,
    prompt,
    concept: clean(e.concept) || null,
    options: stored,
    correct_option_id: OPTION_IDS[ordered.findIndex((o) => o.correct)],
  }
}

export interface NormalizedContent {
  blocks: Block[]
  summary: string
  exercises: StoredExercise[]
}

export function normalizeContent(
  raw: LessonContent,
  random: () => number = Math.random,
  /** Referências das mídias da aula (vídeo principal e imagens), na ordem. */
  mediaRefs: string[] = [],
): NormalizedContent {
  const pending = new Set(mediaRefs)
  const blocks = raw.blocks.map((b) => toBlock(b, pending)).filter((b): b is Block => b !== null)
  if (blocks.filter((b) => b.type !== 'heading' && b.type !== 'media').length < 2) {
    throw new OutputError('A aula veio com menos de dois blocos de conteúdo.')
  }
  // Mídia escolhida que o modelo não posicionou entra depois da abertura: o
  // vídeo e as imagens foram escolhidos para esta aula e precisam aparecer.
  if (pending.size) {
    const opening = blocks.findIndex((b) => b.type !== 'heading')
    blocks.splice(opening + 1, 0, ...[...pending].map((ref): Block => ({ type: 'media', ref })))
  }
  const exercises = raw.exercises
    .map((e) => toExercise(e, random))
    .filter((e): e is Omit<StoredExercise, 'position'> => e !== null)
    .slice(0, 6)
    .map((e, i) => ({ ...e, position: i + 1 }))
  if (exercises.length === 0) {
    throw new OutputError('Nenhum exercício válido: cada um precisa de exatamente uma alternativa certa e explicação em todas.')
  }
  return { blocks, summary: clean(raw.summary), exercises }
}
