// lib/api.ts — cliente da API do backend.
//
// Toda chamada leva o access token do Supabase. Erros viram `ApiError` com o
// status e o `code` estável que o backend manda (`subject_limit`,
// `daily_quota`, `topic_not_allowed`...): a tela decide pelo código, nunca por
// pedaço de texto.
import { Platform } from 'react-native'
import { getAccessToken } from '@/lib/supabase'
import { API_BASE_URL } from '@/lib/constants'
import type {
  AvailabilityInput, CompleteResult, CreateSubjectInput, Lesson, Profile, SubjectDetail, SubjectSummary, Today,
} from '@/lib/types'

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message)
  }
}

/** Fora de produção, troca o "hoje" do backend para testar dias seguidos. */
let debugDate: string | null = null
export function setDebugDate(date: string | null) {
  if (__DEV__) debugDate = date
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!API_BASE_URL) throw new ApiError(0, 'no_api_url', 'EXPO_PUBLIC_API_URL não está configurada.')
  const token = await getAccessToken()
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Platform': Platform.OS,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(debugDate ? { 'x-debug-date': debugDate } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
  } catch {
    throw new ApiError(0, 'network', 'Sem conexão. Confira sua internet e tente de novo.')
  }
  const text = await res.text()
  const data = text ? safeJson(text) : null
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error
    throw new ApiError(res.status, err?.code ?? 'http_error', err?.message ?? 'Algo deu errado. Tente de novo.')
  }
  return data as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** Mensagem para mostrar ao usuário a partir de qualquer erro. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return 'Algo deu errado. Tente de novo.'
}

export const api = {
  me: () => request<Profile>('/api/me'),
  updateMe: (body: { displayName?: string; timezone?: string; onboarded?: true }) =>
    request<Profile>('/api/me', { method: 'PATCH', body }),
  deleteAccount: () => request<{ ok: true }>('/api/me', { method: 'DELETE' }),

  today: () => request<Today>('/api/today'),

  subjects: () => request<{ subjects: SubjectSummary[] }>('/api/subjects').then((r) => r.subjects),
  subject: (id: string) => request<SubjectDetail>(`/api/subjects/${id}`),
  createSubject: (body: CreateSubjectInput) => request<{ id: string }>('/api/subjects', { method: 'POST', body }),
  updateSubject: (id: string, body: { status?: 'active' | 'paused'; archived?: boolean; title?: string; icon?: string }) =>
    request<SubjectDetail>(`/api/subjects/${id}`, { method: 'PATCH', body }),
  deleteSubject: (id: string) => request<{ ok: true }>(`/api/subjects/${id}`, { method: 'DELETE' }),
  approvePath: (id: string) => request<SubjectDetail>(`/api/subjects/${id}/path`, { method: 'POST', body: { action: 'approve' } }),
  adjustPath: (id: string, text: string) =>
    request<SubjectDetail>(`/api/subjects/${id}/path`, { method: 'POST', body: { action: 'adjust', request: text } }),
  retryPath: (id: string) => request<SubjectDetail>(`/api/subjects/${id}/path`, { method: 'POST', body: { action: 'retry' } }),
  updateAvailability: (id: string, body: AvailabilityInput) =>
    request<SubjectDetail>(`/api/subjects/${id}/availability`, { method: 'PUT', body }),
  extraSession: (id: string) =>
    request<{ sessionId: string; lessonId: string }>(`/api/subjects/${id}/extra`, { method: 'POST' }),

  lesson: (id: string, sessionId?: string | null) =>
    request<Lesson>(`/api/lessons/${id}${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''}`),
  completeLesson: (id: string, sessionId?: string | null) =>
    request<CompleteResult>(`/api/lessons/${id}/complete`, { method: 'POST', body: { sessionId: sessionId ?? null } }),
  answer: (exerciseId: string, optionId: string, sessionId?: string | null) =>
    request<{ correct: boolean; correctOptionId: string }>(`/api/exercises/${exerciseId}/answer`, {
      method: 'POST', body: { optionId, sessionId: sessionId ?? null },
    }),
  report: (body: { lessonId: string; exerciseId?: string | null; reason: 'wrong_fact' | 'wrong_answer' | 'confusing' | 'other'; message?: string | null }) =>
    request<{ ok: true }>('/api/reports', { method: 'POST', body }),

  registerPush: (token: string) =>
    request<{ ok: true }>('/api/push/register', { method: 'POST', body: { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' } }),
  unregisterPush: (token: string) =>
    request<{ ok: true }>('/api/push/register', { method: 'DELETE', body: { token } }),
}
