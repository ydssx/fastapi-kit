import type { PlaygroundTopic } from '../types/api'

export function samePlaygroundTopic(a: PlaygroundTopic, b: PlaygroundTopic): boolean {
  return a.title === b.title && a.reason === b.reason
}

export function topicInList(list: PlaygroundTopic[], topic: PlaygroundTopic): boolean {
  return list.some((item) => samePlaygroundTopic(item, topic))
}

export function toggleTopicInList(
  list: PlaygroundTopic[],
  topic: PlaygroundTopic,
): PlaygroundTopic[] {
  if (topicInList(list, topic)) {
    return list.filter((item) => !samePlaygroundTopic(item, topic))
  }
  return [...list, topic]
}

export function removeTopicFromList(
  list: PlaygroundTopic[],
  topic: PlaygroundTopic,
): PlaygroundTopic[] {
  return list.filter((item) => !samePlaygroundTopic(item, topic))
}
