import { describe, expect, it } from 'vitest'
import {
  removeTopicFromList,
  samePlaygroundTopic,
  toggleTopicInList,
  topicInList,
} from './playgroundTopics'

const a = { title: 'A', reason: 'ra' }
const b = { title: 'B', reason: 'rb' }

describe('playgroundTopics', () => {
  it('compares topics by title and reason', () => {
    expect(samePlaygroundTopic(a, { title: 'A', reason: 'ra' })).toBe(true)
    expect(samePlaygroundTopic(a, b)).toBe(false)
  })

  it('toggles topics in the slate list', () => {
    expect(toggleTopicInList([], a)).toEqual([a])
    expect(toggleTopicInList([a], a)).toEqual([])
    expect(topicInList(toggleTopicInList([a], b), b)).toBe(true)
  })

  it('removes a handed-off topic', () => {
    expect(removeTopicFromList([a, b], a)).toEqual([b])
  })
})
