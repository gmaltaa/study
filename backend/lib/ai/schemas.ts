// lib/ai/schemas.ts — o formato que cada etapa da IA devolve.
//
// Os schemas de GERAÇÃO são frouxos de propósito: tipos e descrições, sem
// mínimo e máximo. Um limite violado no schema faz a chamada inteira falhar; um
// limite violado conferido em código (lib/ai/validate.ts) é corrigido ou
// recusado com uma mensagem clara. Campos opcionais são `nullable`, e não
// `optional`, porque é o que a saída estruturada dos provedores aceita.
import { z } from 'zod'

export const topicProfileSchema = z.object({
  allowed: z.boolean().describe('false se o tema for perigoso, ilegal ou não puder ser ensinado'),
  refusal_reason: z.string().nullable().describe('motivo curto da recusa, em pt-BR; null se allowed'),
  normalized_title: z.string().describe('título curto e claro do tema, em pt-BR, com inicial maiúscula'),
  domain: z.enum(['factual', 'technical', 'practical', 'language', 'creative', 'other']),
  accuracy_sensitivity: z.enum(['high', 'normal'])
    .describe('high para história, ciências, saúde, direito, finanças e outros temas em que erro de fato prejudica'),
  disclaimer: z.string().nullable()
    .describe('aviso curto quando o tema pede (saúde, direito, finanças); null se não precisar'),
  icon: z.string().describe('um único emoji que represente o tema'),
})
export type TopicProfile = z.infer<typeof topicProfileSchema>

export const pathModulesSchema = z.object({
  modules: z.array(z.object({
    title: z.string(),
    objective: z.string().describe('o que o aluno sabe fazer ao terminar o módulo, numa frase'),
    builds_on: z.string().nullable().describe('o que este módulo usa do anterior; null no primeiro'),
    minutes: z.number().int().describe('minutos de estudo do módulo'),
  })),
})
export type PathModules = z.infer<typeof pathModulesSchema>

export const moduleLessonsSchema = z.object({
  lessons: z.array(z.object({
    title: z.string(),
    objectives: z.array(z.string()).describe('2 a 4 objetivos de aprendizagem'),
    key_concepts: z.array(z.string()).describe('2 a 6 conceitos-chave da aula'),
    minutes: z.number().int(),
  })),
})
export type ModuleLessons = z.infer<typeof moduleLessonsSchema>

export const BLOCK_TYPES = ['heading', 'paragraph', 'list', 'example', 'callout', 'key_points', 'code', 'quote', 'media'] as const

export const lessonContentSchema = z.object({
  blocks: z.array(z.object({
    type: z.enum(BLOCK_TYPES),
    title: z.string().nullable().describe('título do bloco (example, callout, key_points); null nos outros'),
    text: z.string().nullable().describe('texto do bloco; em media, a referência da mídia (ex.: "vid1", "img1"); null em list e key_points'),
    items: z.array(z.string()).nullable().describe('itens de list e key_points; null nos outros'),
    language: z.string().nullable().describe('linguagem do bloco code; null nos outros'),
  })),
  summary: z.string().describe('resumo da aula em 2 ou 3 frases'),
  exercises: z.array(z.object({
    kind: z.enum(['multiple_choice', 'true_false']),
    prompt: z.string(),
    concept: z.string().describe('o conceito-chave que a questão testa'),
    options: z.array(z.object({
      text: z.string(),
      correct: z.boolean(),
      explanation: z.string().describe('por que esta alternativa está certa ou errada'),
    })),
  })),
})
export type LessonContent = z.infer<typeof lessonContentSchema>

export const accuracyReviewSchema = z.object({
  issues: z.array(z.object({
    quote: z.string().describe('o trecho exato com problema'),
    problem: z.string().describe('o que está errado ou duvidoso'),
    fix: z.string().describe('como deveria estar'),
  })),
})
export type AccuracyReview = z.infer<typeof accuracyReviewSchema>

export const mediaSelectionSchema = z.object({
  core_video: z.object({
    id: z.string(),
    language: z.string().describe('idioma falado no vídeo: pt, en ou outro código de 2 letras'),
    reason: z.string().describe('por que este vídeo ajuda nesta aula, em uma frase'),
  }).nullable().describe('vídeo principal da aula; null se nenhum servir'),
  images: z.array(z.object({
    id: z.string(),
    caption: z.string().describe('legenda curta: o que a imagem mostra, só com o que está na descrição dela'),
    reason: z.string(),
  })).describe('até 2 imagens; vazio se nenhuma mostrar claramente o assunto'),
  reading: z.object({ id: z.string(), reason: z.string() }).nullable().describe('artigo para aprofundar; null se nenhum servir'),
  extras: z.array(z.object({
    id: z.string(),
    language: z.string(),
    reason: z.string(),
  })).describe('até 2 vídeos ou podcasts para ir além; vazio se nenhum servir'),
})
export type MediaSelection = z.infer<typeof mediaSelectionSchema>

// ─── Formato gravado no banco e entregue ao app ────────────────────────────

export type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'key_points'; title: string | null; items: string[] }
  | { type: 'example'; title: string | null; text: string }
  | { type: 'callout'; title: string | null; text: string }
  | { type: 'code'; language: string | null; text: string }
  /** Mídia externa escolhida para a aula (vídeo principal ou imagem). Ver lesson_media.ref. */
  | { type: 'media'; ref: string }

export interface StoredOption {
  id: string
  text: string
  explanation: string
}

export interface StoredExercise {
  position: number
  kind: 'multiple_choice' | 'true_false'
  prompt: string
  concept: string | null
  options: StoredOption[]
  correct_option_id: string
}
