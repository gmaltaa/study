// lib/analytics.ts — eventos de produto no PostHog.
//
// Sem EXPO_PUBLIC_POSTHOG_API_KEY, tudo vira no-op. O cliente carrega sob
// demanda; eventos disparados antes disso ficam numa fila e saem depois.
import type PostHog from 'posthog-react-native'

export type AnalyticsEvent =
  | 'signup_completed'
  | 'onboarding_completed'
  | 'subject_created'
  | 'path_approved'
  | 'path_adjusted'
  | 'lesson_started'
  | 'lesson_completed'
  | 'session_completed'
  | 'exercise_answered'
  | 'content_reported'
  | 'reminder_enabled'

type Props = Record<string, string | number | boolean | null>

let client: PostHog | null = null
let loading = false
const queue: { event: AnalyticsEvent; props?: Props }[] = []
let pendingUser: string | null = null

export function initAnalytics() {
  const key = process.env.EXPO_PUBLIC_POSTHOG_API_KEY
  if (!key || client || loading) return
  loading = true
  import('posthog-react-native')
    .then(({ default: PostHogClient }) => {
      client = new PostHogClient(key, {
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
        flushAt: 20,
        flushInterval: 30000,
      })
      if (pendingUser) client.identify(pendingUser)
      for (const e of queue.splice(0)) client.capture(e.event, e.props)
    })
    .catch(() => {})
}

export function track(event: AnalyticsEvent, props?: Props) {
  try {
    if (client) client.capture(event, props)
    else if (process.env.EXPO_PUBLIC_POSTHOG_API_KEY) queue.push({ event, props })
  } catch {}
}

export function identify(userId: string) {
  try {
    if (client) client.identify(userId)
    else pendingUser = userId
  } catch {}
}

export function resetAnalytics() {
  pendingUser = null
  try {
    client?.reset()
  } catch {}
}
