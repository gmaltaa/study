// lib/http.ts — respostas e erros das rotas da API.
//
// Todo erro sai no mesmo formato, `{ error: { code, message } }`. O `code` é
// estável (o app decide a tela por ele); a `message` é para gente ler, em pt-BR.
import { NextResponse } from 'next/server'
import type { ZodError } from 'zod'
import { authenticate, type AuthContext } from '@/lib/auth'

export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message)
  }
}

export const notFound = (what = 'Item') => new HttpError(404, 'not_found', `${what} não encontrado.`)
export const badRequest = (message: string, code = 'invalid_input') => new HttpError(400, code, message)

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

function errorResponse(e: unknown) {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status })
  }
  console.error('[api]', e)
  return NextResponse.json(
    { error: { code: 'internal', message: 'Algo deu errado. Tente de novo em instantes.' } },
    { status: 500 },
  )
}

/** Primeira mensagem legível de um erro do zod. */
export function zodMessage(error: ZodError): string {
  const issue = error.issues[0]
  return issue ? `${issue.path.join('.') || 'corpo'}: ${issue.message}` : 'Dados inválidos.'
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw badRequest('Corpo da requisição não é JSON.')
  }
}

type RouteParams = { params: Promise<Record<string, string>> }

/**
 * Embrulha uma rota autenticada: resolve o usuário, os parâmetros e transforma
 * qualquer erro na resposta padrão.
 */
export function withAuth<P extends Record<string, string> = Record<string, string>>(
  handler: (ctx: AuthContext & { request: Request; params: P }) => Promise<Response>,
) {
  return async (request: Request, route?: RouteParams) => {
    try {
      const auth = await authenticate(request)
      if (!auth) throw new HttpError(401, 'unauthorized', 'Sessão expirada. Entre de novo.')
      const params = (route ? await route.params : {}) as P
      return await handler({ ...auth, request, params })
    } catch (e) {
      return errorResponse(e)
    }
  }
}

/** Rotas sem usuário (webhooks, health). */
export function withErrors(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      return await handler(request)
    } catch (e) {
      return errorResponse(e)
    }
  }
}
