import { describe, expect, it } from 'vitest'
import {
  exerciseCountFor, fitLessons, fitModules, normalizeContent, OutputError, scaleToFit,
} from '@/lib/ai/validate'
import type { LessonContent } from '@/lib/ai/schemas'

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

describe('scaleToFit', () => {
  it('não mexe no que já cabe', () => {
    expect(scaleToFit([10, 20], 60, 5)).toEqual([10, 20])
  })
  it('reduz na proporção até caber, sem passar do mínimo', () => {
    const out = scaleToFit([100, 50, 7], 60, 5)
    expect(sum(out)).toBeLessThanOrEqual(60)
    expect(Math.min(...out)).toBeGreaterThanOrEqual(5)
  })
})

describe('fitModules', () => {
  const raw = {
    modules: [
      { title: ' Origens ', objective: 'Entender o começo', builds_on: 'nada', minutes: 300 },
      { title: 'Expansão', objective: 'Ligar causas', builds_on: 'Origens', minutes: 300 },
      { title: '', objective: 'sem título', builds_on: null, minutes: 100 },
    ],
  }
  it('soma no máximo o orçamento e limpa os textos', () => {
    const out = fitModules(raw, 400)
    expect(out).toHaveLength(2)
    expect(sum(out.map((m) => m.minutes))).toBeLessThanOrEqual(400)
    expect(out[0]).toMatchObject({ title: 'Origens', builds_on: null })
  })
  it('recusa trilha sem módulo', () => {
    expect(() => fitModules({ modules: [] }, 400)).toThrow(OutputError)
  })
})

describe('fitLessons', () => {
  it('cada aula fica entre 5 min e o máximo, somando até o orçamento do módulo', () => {
    const raw = { lessons: Array.from({ length: 8 }, (_, i) => ({ title: `Aula ${i}`, objectives: ['a'], key_concepts: ['b'], minutes: 45 })) }
    const out = fitLessons(raw, 100, 20)
    for (const l of out) {
      expect(l.minutes).toBeGreaterThanOrEqual(5)
      expect(l.minutes).toBeLessThanOrEqual(20)
    }
    expect(sum(out.map((l) => l.minutes))).toBeLessThanOrEqual(100)
  })
  it('corta aulas que não caberiam nem no mínimo', () => {
    const raw = { lessons: Array.from({ length: 10 }, (_, i) => ({ title: `Aula ${i}`, objectives: [], key_concepts: [], minutes: 5 })) }
    expect(fitLessons(raw, 20, 20)).toHaveLength(4)
  })
})

describe('normalizeContent', () => {
  const base: LessonContent = {
    blocks: [
      { type: 'heading', title: null, text: 'Introdução', items: null, language: null },
      { type: 'paragraph', title: null, text: 'Texto um.', items: null, language: null },
      { type: 'list', title: null, text: null, items: ['x', 'y'], language: null },
      { type: 'list', title: null, text: null, items: [], language: null },
    ],
    summary: 'Resumo.',
    exercises: [
      {
        kind: 'multiple_choice', prompt: 'Qual?', concept: 'c',
        options: [
          { text: 'A', correct: true, explanation: 'certa' },
          { text: 'B', correct: false, explanation: 'errada' },
          { text: 'C', correct: false, explanation: 'errada' },
        ],
      },
      {
        kind: 'multiple_choice', prompt: 'Duas certas', concept: 'c',
        options: [
          { text: 'A', correct: true, explanation: 'x' },
          { text: 'B', correct: true, explanation: 'x' },
          { text: 'C', correct: false, explanation: 'x' },
        ],
      },
      {
        kind: 'true_false', prompt: 'É verdade?', concept: 'c',
        options: [
          { text: 'Falso', correct: true, explanation: 'porque sim' },
          { text: 'Verdadeiro', correct: false, explanation: 'porque não' },
        ],
      },
    ],
  }

  it('descarta bloco vazio e exercício com duas certas', () => {
    const out = normalizeContent(base, () => 0.5)
    expect(out.blocks).toHaveLength(3)
    expect(out.exercises.map((e) => e.prompt)).toEqual(['Qual?', 'É verdade?'])
  })

  it('a alternativa certa continua certa depois de embaralhar', () => {
    for (let seed = 0; seed < 20; seed++) {
      const out = normalizeContent(base, () => (seed * 0.37) % 1)
      const mc = out.exercises[0]
      expect(mc.options.find((o) => o.id === mc.correct_option_id)?.text).toBe('A')
    }
  })

  it('verdadeiro ou falso fica na ordem natural', () => {
    const tf = normalizeContent(base).exercises[1]
    expect(tf.options.map((o) => o.text)).toEqual(['Verdadeiro', 'Falso'])
    expect(tf.correct_option_id).toBe('b')
  })

  it('recusa aula sem exercício válido', () => {
    expect(() => normalizeContent({ ...base, exercises: [base.exercises[1]] })).toThrow(OutputError)
  })
})

it('quantidade de exercícios acompanha a duração', () => {
  expect(exerciseCountFor(5)).toBe(2)
  expect(exerciseCountFor(20)).toBe(5)
  expect(exerciseCountFor(30)).toBe(6)
})
