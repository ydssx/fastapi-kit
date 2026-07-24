import { describe, expect, it } from 'vitest'
import { countWeeklyRhythm, startOfLocalWeek } from './weeklyRhythm'
import type { Project } from '../types/api'

function project(partial: Partial<Project> & Pick<Project, 'id' | 'status'>): Project {
  return {
    title: 't',
    pipeline_id: 'long_article',
    current_step_key: 'topic',
    target_platforms: ['xiaohongshu'],
    primary_platform_key: 'xiaohongshu',
    draft_content: {},
    publish_checklist_state: {},
    artifacts: [],
    publish_progress: null,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    completed_at: null,
    ...partial,
  }
}

describe('weeklyRhythm', () => {
  it('starts local week on Monday', () => {
    // Wednesday Jul 15 2026
    const start = startOfLocalWeek(new Date(2026, 6, 15, 12, 0, 0))
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(6)
    expect(start.getDate()).toBe(13)
    expect(start.getDay()).toBe(1)
  })

  it('counts in-progress and completed-this-week', () => {
    const now = new Date(2026, 6, 15, 12, 0, 0) // Wed
    const counts = countWeeklyRhythm(
      [
        project({ id: '1', status: 'in_progress' }),
        project({ id: '2', status: 'in_progress' }),
        project({
          id: '3',
          status: 'completed',
          completed_at: new Date(2026, 6, 14, 10, 0, 0).toISOString(),
        }),
        project({
          id: '4',
          status: 'completed',
          completed_at: new Date(2026, 6, 6, 10, 0, 0).toISOString(),
        }),
      ],
      now,
      4,
    )
    expect(counts).toEqual({ target: 4, inProgress: 2, completedThisWeek: 1 })
  })
})
