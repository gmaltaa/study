// lib/inngest/client.ts — cliente do Inngest e os nomes dos eventos.
//
// Em desenvolvimento, `pnpm inngest` sobe o servidor local do Inngest, que
// descobre as funções em /api/inngest. Em produção, as chaves INNGEST_EVENT_KEY
// e INNGEST_SIGNING_KEY vêm da integração com a Vercel.
import { Inngest } from 'inngest'

export const inngest = new Inngest({ id: 'estudos' })

export const EVENTS = {
  /** Gerar (ou regerar) a estrutura de uma trilha. data: { userId, subjectId, pathId } */
  generatePath: 'path/generate.requested',
  /** Gerar o conteúdo de uma aula. data: { userId, lessonId } */
  generateLesson: 'lesson/generate.requested',
  /** Trilha aprovada: pré-gera as primeiras aulas. data: { userId, subjectId } */
  subjectActivated: 'subject/activated',
} as const
