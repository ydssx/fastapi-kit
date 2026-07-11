/** Single source for creator platform options (picker + labels). */
export type CreatorPlatform = {
  key: string
  label: string
  emoji: string
}

export const CREATOR_PLATFORMS: CreatorPlatform[] = [
  { key: 'douyin', label: '抖音', emoji: '🎵' },
  { key: 'xiaohongshu', label: '小红书', emoji: '📕' },
  { key: 'wechat', label: '公众号', emoji: '💬' },
  { key: 'bilibili', label: 'B站', emoji: '📺' },
]
