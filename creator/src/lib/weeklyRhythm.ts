import type { Project } from '../types/api'

export const DEFAULT_WEEKLY_TARGET = 4

export interface WeeklyRhythmCounts {
  target: number
  inProgress: number
  completedThisWeek: number
}

/** Monday 00:00:00.000 local time for the week containing `now`. */
export function startOfLocalWeek(now: Date): Date {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 Sun … 6 Sat
  const mondayOffset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + mondayOffset)
  return d
}

export function endOfLocalWeek(now: Date): Date {
  const start = startOfLocalWeek(now)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return end
}

export function countWeeklyRhythm(
  projects: Project[],
  now: Date = new Date(),
  target: number = DEFAULT_WEEKLY_TARGET,
): WeeklyRhythmCounts {
  const weekStart = startOfLocalWeek(now)
  const weekEnd = endOfLocalWeek(now)

  let inProgress = 0
  let completedThisWeek = 0

  for (const project of projects) {
    if (project.status !== 'completed') {
      inProgress += 1
      continue
    }
    if (!project.completed_at) continue
    const completedAt = new Date(project.completed_at)
    if (completedAt >= weekStart && completedAt < weekEnd) {
      completedThisWeek += 1
    }
  }

  return { target, inProgress, completedThisWeek }
}
