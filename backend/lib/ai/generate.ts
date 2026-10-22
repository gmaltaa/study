// lib/ai/generate.ts — as chamadas aos modelos, uma função por etapa.
//
// Toda chamada passa por `call`: saída estruturada validada pelo zod, registro
// em `generation_jobs` (tokens, latência, erro) e cache de prompt do Gateway.
// Quando a saída passa no zod mas não nas regras de lib/ai/validate.ts, a etapa
// tenta mais uma vez com o motivo da recusa no prompt.
import { generateText, Output } from 'ai'
import type { z } from 'zod'
import { adminClient } from '@/lib/supabase'
import { MODELS, PROMPT_VERSION } from '@/lib/ai/models'
import {
  accuracyReviewSchema, lessonContentSchema, mediaSelectionSchema, moduleLessonsSchema, pathModulesSchema, topicProfileSchema,
  type AccuracyReview, type TopicProfile,
} from '@/lib/ai/schemas'
import {
  ACCURACY_REVIEW_SYSTEM, LESSON_CONTENT_SYSTEM, MEDIA_SELECTION_SYSTEM, MODULE_LESSONS_SYSTEM, PATH_MODULES_SYSTEM, TOPIC_PROFILE_SYSTEM,
  accuracyReviewPrompt, lessonContentPrompt, mediaSelectionPrompt, moduleLessonsPrompt, pathModulesPrompt, topicProfilePrompt,
  type LearnerInput, type LessonOutline,
} from '@/lib/ai/prompts'
import {
  exerciseCountFor, fitLessons, fitModules, normalizeContent, OutputError, wordTargetFor,
  type FittedLesson, type FittedModule, type NormalizedContent,
} from '@/lib/ai/validate'
import { labelCandidates, toPromptCandidates, validateSelection } from '@/lib/media/select'
import { EMPTY_PLAN, type LessonMediaPlan, type MediaCandidate } from '@/lib/media/types'

type JobKind = keyof typeof PROMPT_VERSION

interface CallMeta {
  kind: JobKind
  userId: string
  subjectId?: string | null
  refId?: string | null
}

async function logJob(meta: CallMeta, model: string, row: {
  status: 'succeeded' | 'failed'
  input_tokens?: number | null
  output_tokens?: number | null
  latency_ms: number
  error?: string
}) {
  try {
    await adminClient().from('generation_jobs').insert({
      user_id: meta.userId,
      subject_id: meta.subjectId ?? null,
      kind: meta.kind,
      ref_id: meta.refId ?? null,
      model,
      prompt_version: PROMPT_VERSION[meta.kind],
      ...row,
    })
  } catch (e) {
    // O registro nunca derruba a geração.
    console.error('[ai] falha ao registrar job', e)
  }
}

async function call<S extends z.ZodTypeAny>(meta: CallMeta, opts: {
  model: string
  system: string
  prompt: string
  schema: S
  temperature?: number
}): Promise<z.infer<S>> {
  const started = Date.now()
  try {
    const result = await generateText({
      model: opts.model,
      system: opts.system,
      prompt: opts.prompt,
      temperature: opts.temperature,
      output: Output.object({ schema: opts.schema }),
      maxRetries: 2,
      providerOptions: { gateway: { caching: 'auto' } },
    })
    if (result.output == null) throw new OutputError('O modelo não devolveu a saída estruturada.')
    await logJob(meta, opts.model, {
      status: 'succeeded',
      input_tokens: result.usage.inputTokens ?? null,
      output_tokens: result.usage.outputTokens ?? null,
      latency_ms: Date.now() - started,
    })
    return result.output as z.infer<S>
  } catch (e) {
    await logJob(meta, opts.model, {
      status: 'failed',
      latency_ms: Date.now() - started,
      error: String((e as Error)?.message ?? e).slice(0, 500),
    })
    throw e
  }
}

/** Roda a etapa; se a saída for recusada pelas regras, tenta de novo com o motivo. */
async function withFeedback<T>(attempt: (feedback: string | null) => Promise<T>): Promise<T> {
  try {
    return await attempt(null)
  } catch (e) {
    if (!(e instanceof OutputError)) throw e
    return attempt(e.message)
  }
}

// ─── Etapa 1: perfil do tema (síncrono, na criação) ────────────────────────

export function profileTopic(userId: string, title: string, goal: string | null): Promise<TopicProfile> {
  return call({ kind: 'topic_profile', userId }, {
    model: MODELS.fast,
    system: TOPIC_PROFILE_SYSTEM,
    prompt: topicProfilePrompt(title, goal),
    schema: topicProfileSchema,
    temperature: 0,
  })
}

// ─── Etapa 3a: módulos ─────────────────────────────────────────────────────

export function generateModules(meta: { userId: string; subjectId: string; pathId: string }, input: LearnerInput & {
  budgetMinutes: number
  lessonMaxMinutes: number
  adjustment: string | null
  previousModules: string[] | null
}): Promise<FittedModule[]> {
  return withFeedback(async (feedback) => {
    const raw = await call({ kind: 'path_modules', userId: meta.userId, subjectId: meta.subjectId, refId: meta.pathId }, {
      model: MODELS.path,
      system: PATH_MODULES_SYSTEM,
      prompt: pathModulesPrompt({ ...input, feedback }),
      schema: pathModulesSchema,
      temperature: 0.4,
    })
    return fitModules(raw, input.budgetMinutes)
  })
}

// ─── Etapa 3b: aulas de um módulo ──────────────────────────────────────────

export function generateModuleLessons(meta: { userId: string; subjectId: string; pathId: string }, input: LearnerInput & {
  modules: FittedModule[]
  index: number
  lessonMaxMinutes: number
}): Promise<FittedLesson[]> {
  return withFeedback(async (feedback) => {
    const raw = await call({ kind: 'module_lessons', userId: meta.userId, subjectId: meta.subjectId, refId: meta.pathId }, {
      model: MODELS.path,
      system: MODULE_LESSONS_SYSTEM,
      prompt: moduleLessonsPrompt({ ...input, feedback }),
      schema: moduleLessonsSchema,
      temperature: 0.4,
    })
    return fitLessons(raw, input.modules[input.index].minutes, input.lessonMaxMinutes)
  })
}

// ─── Etapa 5: conteúdo da aula ─────────────────────────────────────────────

export interface LessonInput extends LearnerInput {
  outline: LessonOutline
  lesson: {
    id: string
    position: number
    title: string
    objectives: string[]
    key_concepts: string[]
    minutes: number
    moduleTitle: string
    moduleObjective: string
  }
}

export function generateLessonContent(
  meta: { userId: string; subjectId: string },
  input: LessonInput,
  corrections: AccuracyReview['issues'] | null = null,
  media: LessonMediaPlan = EMPTY_PLAN,
): Promise<NormalizedContent> {
  // Vídeo principal e imagens entram no texto como blocos `media`; os extras
  // ficam no "Para ir além", fora do texto.
  const placed = media.picks.filter((p) => p.ref)
  return withFeedback(async (feedback) => {
    const raw = await call({ kind: 'lesson_content', userId: meta.userId, subjectId: meta.subjectId, refId: input.lesson.id }, {
      model: MODELS.lesson,
      system: LESSON_CONTENT_SYSTEM,
      prompt: lessonContentPrompt({
        ...input,
        wordTarget: wordTargetFor(input.lesson.minutes, media.coreMinutes),
        exerciseCount: exerciseCountFor(input.lesson.minutes),
        corrections,
        feedback,
        media: placed.map((p) => ({
          ref: p.ref!,
          kind: p.candidate.kind === 'video' ? 'video' : 'image',
          title: p.candidate.kind === 'image' ? p.caption ?? p.candidate.title : p.candidate.title,
          description: p.candidate.kind === 'image' ? p.candidate.description : p.reason,
          minutes: p.countsMinutes || null,
        })),
      }),
      schema: lessonContentSchema,
      temperature: 0.5,
    })
    return normalizeContent(raw, Math.random, placed.map((p) => p.ref!))
  })
}

// ─── Etapa 5a: conteúdo externo da aula ────────────────────────────────────

/** Escolhe, entre resultados reais de busca, o que entra na aula. */
export async function selectLessonMedia(
  meta: { userId: string; subjectId: string; lessonId: string },
  context: {
    subjectTitle: string
    moduleTitle: string
    lessonTitle: string
    objectives: string[]
    keyConcepts: string[]
    lessonMinutes: number
    maxCoreSec: number
  },
  candidates: MediaCandidate[],
): Promise<LessonMediaPlan> {
  if (candidates.length === 0) return EMPTY_PLAN
  const labeled = labelCandidates(candidates)
  const raw = await call({ kind: 'media_selection', userId: meta.userId, subjectId: meta.subjectId, refId: meta.lessonId }, {
    model: MODELS.fast,
    system: MEDIA_SELECTION_SYSTEM,
    prompt: mediaSelectionPrompt({
      ...context,
      maxCoreMinutes: Math.floor(context.maxCoreSec / 60),
      candidates: toPromptCandidates(labeled),
    }),
    schema: mediaSelectionSchema,
    temperature: 0,
  })
  return validateSelection(raw, labeled, context.maxCoreSec)
}

// ─── Etapa 7: revisão de precisão ──────────────────────────────────────────

function contentAsText(content: NormalizedContent): { text: string; exercises: string } {
  const text = content.blocks.map((b) => {
    switch (b.type) {
      case 'list': return b.items.map((i) => `- ${i}`).join('\n')
      case 'key_points': return `${b.title ?? 'Pontos principais'}:\n${b.items.map((i) => `- ${i}`).join('\n')}`
      case 'example': case 'callout': return `${b.title ? `${b.title}: ` : ''}${b.text}`
      case 'media': return ''
      default: return b.text
    }
  }).filter(Boolean).join('\n\n')
  const exercises = content.exercises.map((e) => {
    const opts = e.options.map((o) => `   ${o.id}) ${o.text}${o.id === e.correct_option_id ? '  [marcada como correta]' : ''}`).join('\n')
    return `${e.position}. ${e.prompt}\n${opts}`
  }).join('\n\n')
  return { text, exercises }
}

export async function reviewAccuracy(
  meta: { userId: string; subjectId: string; lessonId: string },
  subjectTitle: string,
  lessonTitle: string,
  content: NormalizedContent,
): Promise<AccuracyReview['issues']> {
  const { text, exercises } = contentAsText(content)
  const out = await call({ kind: 'accuracy_review', userId: meta.userId, subjectId: meta.subjectId, refId: meta.lessonId }, {
    model: MODELS.fast,
    system: ACCURACY_REVIEW_SYSTEM,
    prompt: accuracyReviewPrompt(subjectTitle, lessonTitle, text, exercises),
    schema: accuracyReviewSchema,
    temperature: 0,
  })
  return out.issues.filter((i) => i.quote.trim() && i.problem.trim()).slice(0, 8)
}
