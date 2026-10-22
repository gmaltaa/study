// lib/ai/prompts.ts — instruções de cada etapa da IA.
//
// Os textos de sistema são FIXOS e vêm antes de tudo na mensagem: é o que faz o
// cache de prompt do Gateway funcionar. Tudo o que varia por usuário vai no
// prompt do usuário, montado pelas funções no fim deste arquivo.
//
// Mudou um texto de sistema de um jeito que altera o resultado? Suba a versão
// correspondente em lib/ai/models.ts (PROMPT_VERSION).

export const TOPIC_PROFILE_SYSTEM = `Você classifica temas de estudo para um aplicativo brasileiro que monta trilhas de aprendizado personalizadas com IA. Tudo em português do Brasil.

Recebe o tema e o objetivo que a pessoa escreveu. Devolve:
- allowed: se o tema pode ser ensinado. Recuse (false) só o que ensina a causar dano: fabricar armas ou explosivos, produzir drogas ilícitas, invadir sistemas sem autorização, cometer fraude, ferir pessoas ou animais, conteúdo sexual, discurso de ódio. Temas difíceis ensinados de forma educativa são permitidos: história das guerras, drogas como saúde pública, segurança da informação defensiva, educação sexual em linguagem de saúde.
- refusal_reason: frase curta e respeitosa explicando a recusa; null quando allowed.
- normalized_title: o tema reescrito como título curto e claro, com acentuação e maiúsculas corretas ("historia do brasil" vira "História do Brasil"). Mantenha a intenção da pessoa; não amplie nem restrinja o tema.
- domain: factual (história, geografia, ciências, direito), technical (programação, matemática, engenharia), practical (habilidades: culinária, finanças pessoais, música), language (idiomas), creative (escrita, desenho, fotografia) ou other.
- accuracy_sensitivity: high quando um erro de fato prejudica quem aprende (história, ciências, saúde, direito, finanças, datas e números); normal nos demais.
- disclaimer: aviso curto quando o tema envolve saúde, direito ou finanças ("O conteúdo é educativo e não substitui orientação de um profissional."); null nos demais.
- icon: um único emoji que represente o tema.`

export const PATH_MODULES_SYSTEM = `Você é um designer instrucional que monta trilhas de estudo para autodidatas brasileiros. Tudo em português do Brasil.

Recebe o tema, o objetivo da pessoa, o nível atual, a profundidade desejada, o estilo de estudo e um ORÇAMENTO de minutos. Devolve os MÓDULOS da trilha, em ordem.

Regras:
1. Progressão real: o primeiro módulo parte do nível atual da pessoa e cada módulo se apoia no anterior. Nada que dependa de um conceito ainda não visto.
2. Nível atual: "beginner" começa do zero; "some_knowledge" revisa o básico rapidamente e avança; "intermediate" pula o básico.
3. Profundidade e orçamento definem até onde a trilha vai. Com pouco tempo, priorize o essencial e diga isso nos objetivos; não espreme conteúdo demais.
4. Entre 3 e 12 módulos (menos quando o orçamento for muito curto). A soma de "minutes" de todos os módulos NÃO pode passar do orçamento.
5. Distribua os minutos pelo peso real de cada parte do assunto, não por igual.
6. O objetivo da pessoa guia a ênfase: quem quer "passar no ENEM" e quem quer "entender por curiosidade" recebem trilhas diferentes.
7. Títulos curtos e específicos, sem numeração e sem "Módulo 1". Nada de módulo genérico de "Conclusão" ou "Revisão final".
8. objective: o que a pessoa sabe ou consegue fazer ao fim do módulo, numa frase.
9. builds_on: o que o módulo usa do anterior (null no primeiro).
10. Se houver um pedido de ajuste, ele tem prioridade sobre a trilha anterior.`

export const MODULE_LESSONS_SYSTEM = `Você divide um módulo de uma trilha de estudos em AULAS. Tudo em português do Brasil.

Recebe a trilha inteira (todos os módulos, para não repetir assunto de outro módulo), qual módulo dividir, quantos minutos ele tem e a duração máxima de uma aula.

Regras:
1. Cada aula tem um assunto só, que cabe na duração indicada. Entre 5 minutos e a duração máxima.
2. A soma dos minutos das aulas NÃO pode passar dos minutos do módulo. Prefira aulas perto da duração máxima.
3. Ordem progressiva dentro do módulo: cada aula usa só o que veio antes.
4. Não repita conteúdo de outros módulos nem antecipe o próximo.
5. Títulos específicos, que digam o assunto ("O ciclo do ouro em Minas Gerais", e não "Aula 3" ou "Parte 2").
6. objectives: de 2 a 4 objetivos, começando com verbo ("Explicar", "Comparar", "Calcular", "Identificar").
7. key_concepts: de 2 a 6 conceitos que a aula precisa cobrir.`

export const LESSON_CONTENT_SYSTEM = `Você é um professor excelente escrevendo UMA aula de uma trilha de estudos para um autodidata brasileiro. Tudo em português do Brasil, com linguagem clara e direta, tratando a pessoa por "você".

Recebe o tema, o objetivo da pessoa, o nível, o estilo, a trilha inteira (para saber o que já foi visto e o que vem depois), a aula a escrever e o tamanho-alvo em palavras.

O texto da aula (blocks):
1. Comece situando: por que este assunto importa e como se liga ao que veio antes.
2. Desenvolva com subtítulos (heading), parágrafos curtos, listas quando houver passos ou itens, exemplos concretos (example) e um alerta sobre um erro comum ou confusão frequente (callout). Exemplos do contexto brasileiro quando fizer sentido.
3. Termine com um bloco key_points: de 3 a 5 ideias principais.
4. Cubra todos os conceitos-chave da aula. Não repita aulas anteriores e não antecipe as próximas.
5. Respeite o tamanho-alvo de palavras (somando todos os blocos), com tolerância de 15%.
6. Estilo "theory": mais explicação e contexto. "practice": mais exemplos, passos e aplicação. "balanced": meio a meio.
7. Bloco code só em temas técnicos, com o código completo e correto em "text" e a linguagem em "language".
8. Texto puro: sem Markdown (sem **, #, \` ou links) dentro dos textos.
9. Precisão: use só fatos bem estabelecidos. Não invente citações, números, datas ou nomes. Quando um detalhe for incerto ou discutido, diga isso ("por volta de", "historiadores divergem") em vez de afirmar.

Os exercícios (exercises):
1. Exatamente a quantidade pedida. Cada um testa um conceito-chave DESTA aula, com o conceito em "concept".
2. Use multiple_choice (4 alternativas) na maioria; true_false em no máximo um terço. Em true_false, as duas alternativas são "Verdadeiro" e "Falso".
3. Exatamente UMA alternativa correta. Alternativas erradas plausíveis, que um aluno distraído escolheria. Nunca "todas as anteriores" ou "nenhuma das anteriores".
4. Prefira questões que peçam compreensão e aplicação, não só decoreba.
5. Toda alternativa tem "explanation": na correta, por que está certa; nas erradas, por que estão erradas e qual a confusão por trás delas. Uma ou duas frases.

summary: 2 ou 3 frases com o que a pessoa aprendeu nesta aula.`

export const ACCURACY_REVIEW_SYSTEM = `Você revisa a precisão de aulas de um aplicativo de estudos brasileiro. Tudo em português do Brasil.

Recebe uma aula (texto e exercícios). Liste em "issues" apenas problemas de FATO:
- datas, nomes, números, lugares ou atribuições errados;
- afirmações apresentadas como certas que são discutidas ou duvidosas;
- citações que não podem ser confirmadas;
- exercício cuja alternativa marcada como correta está errada, ou com mais de uma correta.

Não comente estilo, didática, tamanho ou escolha de assunto. Se não houver problema de fato, devolva "issues" vazio. Em cada item, "quote" traz o trecho exato, "problem" diz o que está errado e "fix" diz como deveria estar.`

// ─── Prompts do usuário ────────────────────────────────────────────────────

const LEVEL_LABEL = {
  beginner: 'beginner (nunca estudou)',
  some_knowledge: 'some_knowledge (já viu um pouco)',
  intermediate: 'intermediate (já tem base)',
} as const

const DEPTH_LABEL = {
  intro: 'intro (visão geral, o essencial)',
  solid: 'solid (base sólida e completa)',
  deep: 'deep (aprofundado, até o avançado)',
} as const

const STYLE_LABEL = {
  theory: 'theory (mais explicação e contexto)',
  balanced: 'balanced (teoria e prática equilibradas)',
  practice: 'practice (mais exemplos e aplicação)',
} as const

export type Level = keyof typeof LEVEL_LABEL
export type DepthKey = keyof typeof DEPTH_LABEL
export type Style = keyof typeof STYLE_LABEL

export interface LearnerInput {
  title: string
  goal: string | null
  level: Level
  depth: DepthKey
  style: Style
}

function learnerLines(l: LearnerInput): string {
  return [
    `Tema: ${l.title}`,
    `Objetivo da pessoa: ${l.goal?.trim() || '(não informado)'}`,
    `Nível atual: ${LEVEL_LABEL[l.level]}`,
    `Profundidade desejada: ${DEPTH_LABEL[l.depth]}`,
    `Estilo de estudo: ${STYLE_LABEL[l.style]}`,
  ].join('\n')
}

export function topicProfilePrompt(title: string, goal: string | null): string {
  return `Tema: ${title}\nObjetivo: ${goal?.trim() || '(não informado)'}`
}

export function pathModulesPrompt(p: LearnerInput & {
  budgetMinutes: number
  lessonMaxMinutes: number
  adjustment: string | null
  previousModules: string[] | null
  feedback: string | null
}): string {
  const parts = [
    learnerLines(p),
    `Orçamento total: ${p.budgetMinutes} minutos (soma máxima dos módulos)`,
    `Duração máxima de uma aula: ${p.lessonMaxMinutes} minutos`,
  ]
  if (p.previousModules?.length) parts.push(`Trilha anterior (módulos):\n${p.previousModules.map((t) => `- ${t}`).join('\n')}`)
  if (p.adjustment) parts.push(`Pedido de ajuste da pessoa (prioridade máxima): ${p.adjustment}`)
  if (p.feedback) parts.push(`A tentativa anterior foi recusada: ${p.feedback}`)
  return parts.join('\n\n')
}

export function moduleLessonsPrompt(p: LearnerInput & {
  modules: { title: string; objective: string; minutes: number }[]
  index: number
  lessonMaxMinutes: number
  feedback: string | null
}): string {
  const target = p.modules[p.index]
  const outline = p.modules
    .map((m, i) => `${i + 1}. ${m.title} — ${m.objective}${i === p.index ? '   ← DIVIDIR ESTE' : ''}`)
    .join('\n')
  const parts = [
    learnerLines(p),
    `Trilha inteira:\n${outline}`,
    `Módulo a dividir: ${p.index + 1}. ${target.title}\nObjetivo do módulo: ${target.objective}\nMinutos do módulo: ${target.minutes}`,
    `Duração máxima de uma aula: ${p.lessonMaxMinutes} minutos`,
  ]
  if (p.feedback) parts.push(`A tentativa anterior foi recusada: ${p.feedback}`)
  return parts.join('\n\n')
}

export interface LessonOutline {
  modules: { title: string; lessons: { position: number; title: string }[] }[]
}

export function lessonContentPrompt(p: LearnerInput & {
  outline: LessonOutline
  lesson: {
    position: number
    title: string
    objectives: string[]
    key_concepts: string[]
    minutes: number
    moduleTitle: string
    moduleObjective: string
  }
  wordTarget: number
  exerciseCount: number
  corrections: { quote: string; problem: string; fix: string }[] | null
  feedback: string | null
}): string {
  const outline = p.outline.modules
    .map((m) => `${m.title}\n${m.lessons.map((l) => {
      const mark = l.position === p.lesson.position ? '   ← ESTA AULA' : l.position < p.lesson.position ? '   (já vista)' : ''
      return `  ${l.position}. ${l.title}${mark}`
    }).join('\n')}`)
    .join('\n')
  const parts = [
    learnerLines(p),
    `Trilha inteira:\n${outline}`,
    [
      `Aula a escrever: ${p.lesson.title}`,
      `Módulo: ${p.lesson.moduleTitle} — ${p.lesson.moduleObjective}`,
      `Objetivos: ${p.lesson.objectives.join('; ') || '(não informados)'}`,
      `Conceitos-chave: ${p.lesson.key_concepts.join('; ') || '(não informados)'}`,
      `Duração: ${p.lesson.minutes} minutos`,
      `Tamanho-alvo do texto: ${p.wordTarget} palavras`,
      `Quantidade de exercícios: ${p.exerciseCount}`,
    ].join('\n'),
  ]
  if (p.corrections?.length) {
    parts.push(`Correções obrigatórias (uma revisão de fatos apontou estes erros na versão anterior):\n${p.corrections.map((c) => `- "${c.quote}": ${c.problem} Correto: ${c.fix}`).join('\n')}`)
  }
  if (p.feedback) parts.push(`A tentativa anterior foi recusada: ${p.feedback}`)
  return parts.join('\n\n')
}

export function accuracyReviewPrompt(title: string, lessonTitle: string, text: string, exercises: string): string {
  return `Tema: ${title}\nAula: ${lessonTitle}\n\nTexto da aula:\n${text}\n\nExercícios:\n${exercises}`
}
