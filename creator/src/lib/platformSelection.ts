/** Sync primary platform when the target platform set changes. */
export function syncPrimaryPlatform(platforms: string[], primary: string): string {
  if (platforms.length === 1) return platforms[0]!
  if (primary && !platforms.includes(primary)) return ''
  return primary
}

/** Primary is ready when single-platform or an explicit primary is chosen. */
export function primaryPlatformReady(platforms: string[], primary: string): boolean {
  return platforms.length <= 1 || primary.length > 0
}

/** Effective primary key for API payloads (null when multi-platform and unset). */
export function resolvePrimaryPlatformKey(
  platforms: string[],
  primary: string,
): string | null {
  if (platforms.length === 1) return platforms[0]!
  return primary || null
}
