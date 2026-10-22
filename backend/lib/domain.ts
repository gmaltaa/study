// lib/domain.ts — leituras compartilhadas entre as rotas e os jobs.
//
// Recebem o cliente do Supabase de fora: nas rotas é o do usuário (RLS), nos
// jobs do Inngest é o admin. A mesma função serve aos dois.
import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays, type ISODate } from '@/lib/dates'
import { buildSchedule, type Availability, type Schedule } from '@/lib/schedule'
import type { LearnerInput, Level, DepthKey, Style } from '@/lib/ai/prompts'
import type { TopicProfile } from '@/lib/ai/schemas'
import { notFound } from '@/lib/http'

export type SubjectStatus = 'generating' | 'review' | 'active' | 'paused' | 'completed' | 'failed'

export interface SubjectRow {
  id: string
  user_id: string
  title: string
  goal: string | null
  level: Level
  depth: DepthKey
  preferences: { style?: Style } | null
  icon: string
  color: string
  status: SubjectStatus
  topic_profile: TopicProfile | null
  active_path_id: string | null
  failure_reason: string | null
  reminded_on: string | null
  archived_at: string | null
  created_at: string
}

export interface AvailabilityRow {
  id: string
  subject_id: string
  days_of_week: number[]
  daily_minutes: number
  sessions_per_day: number
  start_date: string
  deadline: string | null
  reminder_time: string | null
  created_at: string
}

export interface LessonRow {
  id: string
  module_id: string
  path_id: string
  position: number
  title: string
  estimated_minutes: number
  content_status: 'pending' | 'generating' | 'ready' | 'failed'
}

export const SUBJECT_COLUMNS =
  'id, user_id, title, goal, level, depth, preferences, icon, color, status, topic_profile, active_path_id, failure_reason, reminded_on, archived_at, created_at'

export const LESSON_COLUMNS = 'id, module_id, path_id, position, title, estimated_minutes, content_status'

/** Lê um tema; 404 quando não existe ou não é do usuário (RLS). */
export async function loadSubject(db: SupabaseClient, id: string): Promise<SubjectRow> {
  const { data, error } = await db.from('subjects').select(SUBJECT_COLUMNS).eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) throw notFound('Tema')
  return data as SubjectRow
}

export function toAvailability(row: AvailabilityRow): Availability {
  return {
    daysOfWeek: row.days_of_week,
    dailyMinutes: row.daily_minutes,
    sessionsPerDay: row.sessions_per_day,
    startDate: row.start_date,
    deadline: row.deadline,
  }
}

export function learnerInput(s: SubjectRow): LearnerInput {
  return {
    title: s.title,
    goal: s.goal,
    level: s.level,
    depth: s.depth,
    style: s.preferences?.style ?? 'balanced',
  }
}

/** A disponibilidade mais recente de cada tema. */
export async function latestAvailabilities(db: SupabaseClient, subjectIds: string[]): Promise<Map<string, AvailabilityRow>> {
  const out = new Map<string, AvailabilityRow>()
  if (subjectIds.length === 0) return out
  const { data, error } = await db
    .from('availabilities')
    .select('id, subject_id, days_of_week, daily_minutes, sessions_per_day, start_date, deadline, reminder_time, created_at')
    .in('subject_id', subjectIds)
    .order('created_at', { ascending: false })
  if (error) throw error
  for (const row of (data ?? []) as AvailabilityRow[]) if (!out.has(row.subject_id)) out.set(row.subject_id, row)
  return out
}

export async function latestAvailability(db: SupabaseClient, subjectId: string): Promise<AvailabilityRow | null> {
  return (await latestAvailabilities(db, [subjectId])).get(subjectId) ?? null
}

/** Aulas das trilhas informadas, na ordem da trilha. */
export async function lessonsOfPaths(db: SupabaseClient, pathIds: string[]): Promise<Map<string, LessonRow[]>> {
  const out = new Map<string, LessonRow[]>()
  if (pathIds.length === 0) return out
  const { data, error } = await db
    .from('lessons')
    .select(LESSON_COLUMNS)
    .in('path_id', pathIds)
    .order('position', { ascending: true })
  if (error) throw error
  for (const row of (data ?? []) as LessonRow[]) {
    const list = out.get(row.path_id) ?? []
    list.push(row)
    out.set(row.path_id, list)
  }
  return out
}

/** Aulas já concluídas, por tema. */
export async function completedLessons(db: SupabaseClient, subjectIds: string[]): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>()
  if (subjectIds.length === 0) return out
  const { data, error } = await db
    .from('lesson_progress')
    .select('subject_id, lesson_id')
    .in('subject_id', subjectIds)
    .eq('status', 'completed')
  if (error) throw error
  for (const row of (data ?? []) as { subject_id: string; lesson_id: string }[]) {
    const set = out.get(row.subject_id) ?? new Set<string>()
    set.add(row.lesson_id)
    out.set(row.subject_id, set)
  }
  return out
}

/** Aulas de hoje já congeladas em `study_sessions`, por tema. */
export async function frozenToday(db: SupabaseClient, subjectIds: string[], today: ISODate): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>()
  if (subjectIds.length === 0) return out
  const { data, error } = await db
    .from('study_sessions')
    .select('subject_id, session_items(lesson_id)')
    .in('subject_id', subjectIds)
    .eq('scheduled_date', today)
  if (error) throw error
  for (const row of (data ?? []) as { subject_id: string; session_items: { lesson_id: string }[] }[]) {
    const set = out.get(row.subject_id) ?? new Set<string>()
    for (const item of row.session_items ?? []) set.add(item.lesson_id)
    out.set(row.subject_id, set)
  }
  return out
}

/**
 * O cronograma daqui para a frente de um tema.
 *
 * Se hoje já foi congelado (há sessões gravadas para hoje), a projeção começa
 * amanhã e deixa de fora as aulas de hoje. Se não, começa hoje.
 */
export function projectSchedule(p: {
  lessons: LessonRow[]
  completed: Set<string>
  frozenToday: Set<string> | undefined
  todayFrozen: boolean
  availability: AvailabilityRow
  today: ISODate
}): Schedule {
  const remaining = p.lessons
    .filter((l) => !p.completed.has(l.id) && !p.frozenToday?.has(l.id))
    .map((l) => ({ id: l.id, minutes: l.estimated_minutes }))
  return buildSchedule({
    lessons: remaining,
    availability: toAvailability(p.availability),
    from: p.todayFrozen ? addDays(p.today, 1) : p.today,
  })
}
