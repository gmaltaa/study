// GET /api/today — o que estudar hoje, de todos os temas.
//
// Congela as sessões de hoje na primeira leitura do dia (lib/today.ts) e
// devolve também, para os temas sem sessão hoje, quando é a próxima.
import { json, withAuth } from '@/lib/http'
import { todayFor } from '@/lib/requests'
import { activeSubjects, freezeToday, readToday, streakOf } from '@/lib/today'
import { subjectSummaries } from '@/lib/views'

export const GET = withAuth(async ({ supabase, userId, request }) => {
  const { today } = await todayFor(request, supabase, userId)
  await freezeToday(supabase, userId, today)
  const [sessions, subjects] = await Promise.all([readToday(supabase, today), activeSubjects(supabase)])
  const withSession = new Set(sessions.map((s) => s.subject.id))
  const [summaries, streak] = await Promise.all([
    subjectSummaries(supabase, subjects.filter((s) => !withSession.has(s.id)), today),
    streakOf(supabase, userId, today, subjects),
  ])
  return json({
    date: today,
    streak,
    sessions,
    later: summaries
      .filter((s) => s.nextSessionDate)
      .map((s) => ({ id: s.id, title: s.title, icon: s.icon, color: s.color, nextSessionDate: s.nextSessionDate, nextLesson: s.nextLesson })),
  })
})
