// lib/types.ts — o formato das respostas da API (espelha backend/lib/views.ts e
// as rotas). Mudou lá, muda aqui.

export type ISODate = string

export type Level = 'beginner' | 'some_knowledge' | 'intermediate'
export type Depth = 'intro' | 'solid' | 'deep'
export type Style = 'theory' | 'balanced' | 'practice'
export type SubjectStatus = 'generating' | 'review' | 'active' | 'paused' | 'completed' | 'failed'

export interface Profile {
  id: string
  displayName: string | null
  timezone: string
  onboardedAt: string | null
  longestStreak: number
}

export interface Progress {
  completed: number
  total: number
  percent: number
  minutesDone: number
  minutesTotal: number
}

export interface SubjectSummary {
  id: string
  title: string
  icon: string
  color: string
  status: SubjectStatus
  failureReason: string | null
  progress: Progress
  nextLesson: { id: string; title: string } | null
  nextSessionDate: ISODate | null
  endDate: ISODate | null
  deadline: ISODate | null
  fitsDeadline: boolean
  createdAt: string
}

export interface AvailabilityView {
  daysOfWeek: number[]
  dailyMinutes: number
  sessionsPerDay: number
  sessionMinutes: number
  startDate: ISODate
  deadline: ISODate | null
  reminderTime: string | null
}

export interface PathLesson {
  id: string
  position: number
  title: string
  minutes: number
  completed: boolean
  ready: boolean
}

export interface PathModule {
  id: string
  position: number
  title: string
  objective: string
  lessons: PathLesson[]
}

export interface SubjectDetail extends SubjectSummary {
  goal: string | null
  level: Level
  depth: Depth
  style: Style
  disclaimer: string | null
  availability: AvailabilityView | null
  path: {
    id: string
    status: 'generating' | 'ready' | 'failed' | 'superseded'
    version: number
    totalMinutes: number | null
    budgetMinutes: number
    adjustmentRequest: string | null
    modules: PathModule[]
  } | null
  upcoming: { date: ISODate; slot: number; minutes: number; lessons: { id: string; title: string; minutes: number }[] }[]
}

export interface TodaySession {
  id: string
  slot: number
  plannedMinutes: number
  status: 'planned' | 'in_progress' | 'completed' | 'missed'
  isExtra: boolean
  subject: { id: string; title: string; icon: string; color: string }
  lessons: { id: string; title: string; minutes: number; completed: boolean; ready: boolean }[]
}

export interface Today {
  date: ISODate
  streak: { current: number; longest: number; studiedToday: boolean }
  sessions: TodaySession[]
  later: { id: string; title: string; icon: string; color: string; nextSessionDate: ISODate | null; nextLesson: { id: string; title: string } | null }[]
}

export type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'key_points'; title: string | null; items: string[] }
  | { type: 'example'; title: string | null; text: string }
  | { type: 'callout'; title: string | null; text: string }
  | { type: 'code'; language: string | null; text: string }
  /** Vídeo principal ou imagem da aula; `ref` aponta para `Lesson.media`. */
  | { type: 'media'; ref: string }

/** Conteúdo externo: vídeo do YouTube, episódio de podcast, imagem ou artigo. */
export interface MediaItem {
  id: string
  ref: string | null
  /** core: vídeo principal (conta no tempo); inline: imagem no texto; extra: "Para ir além". */
  role: 'core' | 'inline' | 'extra'
  kind: 'video' | 'image' | 'podcast' | 'article'
  provider: 'youtube' | 'wikipedia' | 'itunes'
  title: string
  author: string | null
  /** Página para abrir fora do app. */
  url: string
  /** Vídeo: id do YouTube. Podcast: endereço do áudio. Imagem: endereço da imagem. */
  mediaUrl: string | null
  thumbnailUrl: string | null
  durationSec: number | null
  width: number | null
  height: number | null
  language: string | null
  license: string | null
  attribution: string | null
  description: string | null
  caption: string | null
  reason: string | null
  countsMinutes: number
  feedback: 'helpful' | 'not_helpful' | null
}

export interface MediaLibrary {
  modules: {
    id: string
    position: number
    title: string
    items: (MediaItem & { lesson: { id: string; title: string; position: number } })[]
  }[]
}

export interface ExerciseOption {
  id: string
  text: string
  explanation: string
}

export interface Exercise {
  id: string
  position: number
  kind: 'multiple_choice' | 'true_false'
  prompt: string
  concept: string | null
  options: ExerciseOption[]
  correctOptionId: string
}

export interface Lesson {
  id: string
  position: number
  title: string
  minutes: number
  module: { title: string; position: number }
  subject: { id: string; title: string; icon: string; color: string }
  disclaimer: string | null
  status: 'ready' | 'generating' | 'quota'
  blocks: Block[]
  summary: string | null
  media: MediaItem[]
  exercises: Exercise[]
  completed: boolean
}

export interface CompleteResult {
  sessionCompleted: boolean
  nextInSession: string | null
  subjectCompleted: boolean
  correct: number
  total: number
  streak: { current: number; longest: number }
}

export interface AvailabilityInput {
  daysOfWeek: number[]
  dailyMinutes: number
  sessionsPerDay: number
  startDate?: ISODate
  deadline?: ISODate | null
  reminderTime?: string | null
}

export interface CreateSubjectInput {
  title: string
  goal: string | null
  level: Level
  depth: Depth
  style: Style
  availability: AvailabilityInput
}
