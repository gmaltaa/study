// lib/ai/models.ts — qual modelo faz cada etapa.
//
// Os modelos passam pelo Vercel AI Gateway e são só strings ('provedor/modelo'):
// trocar de modelo é trocar uma variável de ambiente, sem deploy de código. A
// escolha definitiva sai do teste de qualidade (lib/ai/trilhas.eval.test.ts).
//
//  - PATH: estrutura da trilha. Roda poucas vezes por tema e decide a
//    progressão inteira: vale o modelo mais forte.
//  - LESSON: conteúdo e exercícios de cada aula. É o volume: modelo médio.
//  - FAST: classificação do tema e revisão de precisão. Respostas curtas.

export const MODELS = {
  path: process.env.AI_MODEL_PATH || 'openai/gpt-4.1',
  lesson: process.env.AI_MODEL_LESSON || 'openai/gpt-4.1-mini',
  fast: process.env.AI_MODEL_FAST || 'openai/gpt-4.1-mini',
} as const

/** Sobe quando um prompt muda de um jeito que altera o resultado. Fica gravado
 *  em cada trilha e aula: dá para regerar só o que saiu de um prompt ruim. */
export const PROMPT_VERSION = {
  topic_profile: 'tp-1',
  path_modules: 'pm-1',
  module_lessons: 'ml-1',
  lesson_content: 'lc-1',
  accuracy_review: 'ar-1',
} as const
