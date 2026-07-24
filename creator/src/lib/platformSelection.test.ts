import { describe, expect, it } from 'vitest'
import {
  primaryPlatformReady,
  resolvePrimaryPlatformKey,
  syncPrimaryPlatform,
} from './platformSelection'

describe('platformSelection', () => {
  it('syncs primary to the sole platform', () => {
    expect(syncPrimaryPlatform(['douyin'], 'xiaohongshu')).toBe('douyin')
  })

  it('clears primary when removed from the set', () => {
    expect(syncPrimaryPlatform(['douyin', 'bilibili'], 'xiaohongshu')).toBe('')
  })

  it('keeps primary when still selected', () => {
    expect(syncPrimaryPlatform(['douyin', 'xiaohongshu'], 'xiaohongshu')).toBe('xiaohongshu')
  })

  it('marks primary ready for single or set primary', () => {
    expect(primaryPlatformReady(['douyin'], '')).toBe(true)
    expect(primaryPlatformReady(['douyin', 'bilibili'], '')).toBe(false)
    expect(primaryPlatformReady(['douyin', 'bilibili'], 'douyin')).toBe(true)
  })

  it('resolves API primary key', () => {
    expect(resolvePrimaryPlatformKey(['douyin'], '')).toBe('douyin')
    expect(resolvePrimaryPlatformKey(['douyin', 'bilibili'], 'bilibili')).toBe('bilibili')
    expect(resolvePrimaryPlatformKey(['douyin', 'bilibili'], '')).toBe(null)
  })
})
