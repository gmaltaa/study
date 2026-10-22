// lib/ai/trilhas.eval.test.ts — teste de qualidade da geração de trilhas.
//
// Chama a IA de verdade (custa tokens), por isso fica fora do `pnpm test`.
// Rode com `pnpm eval`, com AI_GATEWAY_API_KEY no ambiente. Use a cada mudança
// de prompt ou de modelo: as checagens automáticas pegam regra quebrada, e a
// trilha impressa no console é para ler e julgar a progressão.
import { describe, expect, it } from 'vitest'
import { generateModuleLessons, generateModules } from '@/lib/ai/generate'
import { lessonMaxMinutes, pathBudget, type Availability, type Depth } from '@/lib/schedule'
import type { LearnerInput } from '@/lib/ai/prompts'

const AVAILABILITY: Availability = {
  daysOfWeek: [1, 2, 3, 4, 5], dailyMinutes: 30, sessionsPerDay: 1, startDate: '2026-11-02', deadline: null,
}

const CASES: (LearnerInput & { depth: Depth })[] = [
  { title: 'História do Brasil', goal: 'Entender a formação do país para o ENEM', level: 'beginner', depth: 'solid', style: 'balanced' },
  { title: 'Finanças pessoais', goal: 'Organizar o salário e começar a investir', level: 'beginner', depth: 'intro', style: 'practice' },
  { title: 'Python', goal: 'Automatizar planilhas no trabalho', level: 'beginner', depth: 'solid', style: 'practice' },
  { title: 'Química orgânica', goal: null, level: 'some_knowledge', depth: 'solid', style: 'theory' },
  { title: 'Violão para iniciantes', goal: 'Tocar músicas simples em roda de amigos', level: 'beginner', depth: 'intro', style: 'practice' },
  { title: 'Inglês para viagem', goal: 'Me virar numa viagem para os EUA', level: 'some_knowledge', depth: 'intro', style: 'practice' },
  { title: 'Direito do consumidor', goal: 'Saber meus direitos em compras online', level: 'beginner', depth: 'intro', style: 'balanced' },
  { title: 'Fotografia', goal: 'Tirar fotos melhores com o celular', level: 'beginner', depth: 'intro', style: 'practice' },
  { title: 'Estatística', goal: 'Entender testes de hipótese', level: 'intermediate', depth: 'deep', style: 'theory' },
  { title: 'Filosofia antiga', goal: null, level: 'beginner', depth: 'solid', style: 'theory' },
]

const meta = { userId: '00000000-0000-0000-0000-000000000000', subjectId: 'eval', pathId: 'eval' }

describe('trilhas geradas', () => {
  for (const c of CASES) {
    it(c.title, { timeout: 240_000 }, async () => {
      const budget = pathBudget(AVAILABILITY, c.depth)
      const lessonMax = lessonMaxMinutes(AVAILABILITY)
      const modules = await generateModules(meta, {
        ...c, budgetMinutes: budget, lessonMaxMinutes: lessonMax, adjustment: null, previousModules: null,
      })
      const lessons = await Promise.all(modules.map((_, index) =>
        generateModuleLessons(meta, { ...c, modules, index, lessonMaxMinutes: lessonMax })))

      const all = lessons.flat()
      const total = all.reduce((s, l) => s + l.minutes, 0)
      expect(modules.length).toBeGreaterThanOrEqual(c.depth === 'intro' ? 2 : 3)
      expect(total).toBeLessThanOrEqual(budget)
      for (const l of all) expect(l.minutes).toBeLessThanOrEqual(lessonMax)
      expect(new Set(all.map((l) => l.title.toLowerCase())).size).toBe(all.length)

      console.log(`\n# ${c.title} — ${modules.length} módulos, ${all.length} aulas, ${total}/${budget} min`)
      modules.forEach((m, i) => {
        console.log(`\n${i + 1}. ${m.title} (${m.minutes} min) — ${m.objective}`)
        for (const l of lessons[i]) console.log(`   - ${l.title} (${l.minutes} min)`)
      })
    })
  }
})
