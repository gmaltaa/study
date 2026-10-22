// lib/views.ts — o formato dos temas que a API entrega ao app.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ISODate } from '@/lib/dates'
import {
  completedLessons, frozenToday, latestAvailabilities, lessonsOfPaths, projectSchedule,
  type AvailabilityRow, type LessonRow, type SubjectRow,
} from '@/lib/domain'
import { sessionLength } from '@/lib/schedule'

export interface SubjectSummary {
  id: string
  title: string
  icon: string
  color: string
  status: SubjectRow['status']
  failureReason: string | null
  progress: { completed: number; total: number; percent: number; minutesDone: number; minutesTotal: number }
  nextLesson: { id: string; title: string } | null
  nextSessionDate: ISODate | null
  endDate: ISODate | null
  deadline: ISODate | null
  fitsDeadline: boolean
  createdAt: string
}

interface Loaded {
  availabilities: Map<string, AvailabilityRow>
  lessons: Map<string, LessonRow[]>
  completed: Map<string, Set<string>>
  frozen: Map<string, Set<string>>
}

async function load(db: SupabaseClient, subjects: SubjectRow[], today: ISODate): Promise<Loaded> {
  const ids = subjects.map((s) => s.id)
  const pathIds = subjects.map((s) => s.active_path_id).filter((x): x is string => !!x)
  const [availabilities, lessons, completed, frozen] = await Promise.all([
    latestAvailabilities(db, ids),
    lessonsOfPaths(db, pathIds),
    completedLessons(db, ids),
    frozenToday(db, ids, today),
  ])
  return { availabilities, lessons, completed, frozen }
}

function summarize(s: SubjectRow, l: Loaded, today: ISODate): SubjectSummary {
  const lessons = s.active_path_id ? l.lessons.get(s.active_path_id) ?? [] : []
  const done = l.completed.get(s.id) ?? new Set<string>()
  const availability = l.availabilities.get(s.id)
  const minutesTotal = lessons.reduce((sum, x) => sum + x.estimated_minutes, 0)
  const minutesDone = lessons.filter((x) => done.has(x.id)).reduce((sum, x) => sum + x.estimated_minutes, 0)
  const next = lessons.find((x) => !done.has(x.id)) ?? null

  let endDate: ISODate | null = null
  let fitsDeadline = true
  let nextSessionDate: ISODate | null = null
  if (availability && lessons.length && (s.status === 'active' || s.status === 'review')) {
    const frozen = l.frozen.get(s.id)
    const schedule = projectSchedule({
      lessons, completed: done, frozenToday: frozen, todayFrozen: l.frozen.has(s.id), availability, today,
    })
    const pendingToday = frozen ? [...frozen].some((id) => !done.has(id)) : false
    endDate = schedule.endDate ?? (pendingToday ? today : null)
    fitsDeadline = schedule.fitsDeadline
    nextSessionDate = pendingToday ? today : schedule.sessions[0]?.date ?? null
  }

  return {
    id: s.id,
    title: s.title,
    icon: s.icon,
    color: s.color,
    status: s.status,
    failureReason: s.failure_reason,
    progress: {
      completed: done.size,
      total: lessons.length,
      percent: lessons.length ? Math.round((done.size / lessons.length) * 100) : 0,
      minutesDone,
      minutesTotal,
    },
    nextLesson: next ? { id: next.id, title: next.title } : null,
    nextSessionDate,
    endDate,
    deadline: availability?.deadline ?? null,
    fitsDeadline,
    createdAt: s.created_at,
  }
}

export async function subjectSummaries(db: SupabaseClient, subjects: SubjectRow[], today: ISODate): Promise<SubjectSummary[]> {
  const l = await load(db, subjects, today)
  return subjects.map((s) => summarize(s, l, today))
}

export async function subjectDetail(db: SupabaseClient, s: SubjectRow, today: ISODate) {
  const l = await load(db, [s], today)
  const summary = summarize(s, l, today)
  const availability = l.availabilities.get(s.id) ?? null
  const done = l.completed.get(s.id) ?? new Set<string>()

  let path = null
  if (s.active_path_id) {
    const { data: p, error } = await db
      .from('learning_paths')
      .select('id, status, version, total_minutes, budget_minutes, adjustment_request, modules(id, position, title, objective)')
      .eq('id', s.active_path_id)
      .single()
    if (error) throw error
    const lessons = l.lessons.get(s.active_path_id) ?? []
    const modules = ((p.modules ?? []) as { id: string; position: number; title: string; objective: string }[])
      .sort((a, b) => a.position - b.position)
      .map((m) => ({
        ...m,
        lessons: lessons.filter((x) => x.module_id === m.id).map((x) => ({
          id: x.id, position: x.position, title: x.title, minutes: x.estimated_minutes,
          completed: done.has(x.id), ready: x.content_status === 'ready',
        })),
      }))
    path = {
      id: p.id as string,
      status: p.status as string,
      version: p.version as number,
      totalMinutes: (p.total_minutes as number | null) ?? null,
      budgetMinutes: p.budget_minutes as number,
      adjustmentRequest: (p.adjustment_request as string | null) ?? null,
      modules,
    }
  }

  let upcoming: { date: ISODate; slot: number; minutes: number; lessons: { id: string; title: string; minutes: number }[] }[] = []
  if (availability && s.active_path_id && (s.status === 'active' || s.status === 'review')) {
    const lessons = l.lessons.get(s.active_path_id) ?? []
    const byId = new Map(lessons.map((x) => [x.id, x]))
    const schedule = projectSchedule({
      lessons, completed: done, frozenToday: l.frozen.get(s.id), todayFrozen: l.frozen.has(s.id), availability, today,
    })
    upcoming = schedule.sessions.slice(0, 10).map((x) => ({
      date: x.date,
      slot: x.slot,
      minutes: x.minutes,
      lessons: x.lessonIds.map((id) => ({ id, title: byId.get(id)?.title ?? '', minutes: byId.get(id)?.estimated_minutes ?? 0 })),
    }))
  }

  return {
    ...summary,
    goal: s.goal,
    level: s.level,
    depth: s.depth,
    style: s.preferences?.style ?? 'balanced',
    disclaimer: s.topic_profile?.disclaimer ?? null,
    availability: availability && {
      daysOfWeek: availability.days_of_week,
      dailyMinutes: availability.daily_minutes,
      sessionsPerDay: availability.sessions_per_day,
      sessionMinutes: sessionLength({ dailyMinutes: availability.daily_minutes, sessionsPerDay: availability.sessions_per_day }),
      startDate: availability.start_date,
      deadline: availability.deadline,
      reminderTime: availability.reminder_time?.slice(0, 5) ?? null,
    },
    path,
    upcoming,
  }
}
