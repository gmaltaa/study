// lib/query.ts — cache das respostas da API (TanStack Query).
//
// Toda tela lê por `useQuery` com uma destas chaves, e toda ação que muda dado
// invalida as chaves que dependem dele (`invalidateStudy`). Assim a tela Hoje,
// a lista de temas e o detalhe nunca mostram versões diferentes do mesmo tema.
import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // 4xx não melhora tentando de novo; rede e 5xx tentam mais 2 vezes.
      retry: (count, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && count < 2,
    },
  },
})

export const keys = {
  me: ['me'] as const,
  today: ['today'] as const,
  subjects: ['subjects'] as const,
  subject: (id: string) => ['subject', id] as const,
  lesson: (id: string) => ['lesson', id] as const,
  subjectMedia: (id: string) => ['subject-media', id] as const,
}

/** Depois de qualquer ação de estudo: hoje, a lista e o tema mudam juntos. */
export function invalidateStudy(subjectId?: string) {
  queryClient.invalidateQueries({ queryKey: keys.today })
  queryClient.invalidateQueries({ queryKey: keys.subjects })
  if (subjectId) queryClient.invalidateQueries({ queryKey: keys.subject(subjectId) })
}
