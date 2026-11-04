/**
 * Circuit breaker to prevent hammering external APIs when keys are missing or invalid (401/403).
 * If an external API returns 401/403, we pause attempts for 5 minutes and immediately serve fallbacks.
 */
let owmInvalidUntil = 0
let maptilerInvalidUntil = 0

const COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

export function isOwmAvailable(apiKey?: string): boolean {
  if (!apiKey || apiKey.includes('your_') || apiKey.trim().length < 10) return false
  if (Date.now() < owmInvalidUntil) return false
  return true
}

export function markOwmFailed(): void {
  owmInvalidUntil = Date.now() + COOLDOWN_MS
}

export function isMapTilerAvailable(apiKey?: string): boolean {
  if (!apiKey || apiKey.includes('your_') || apiKey.trim().length < 10) return false
  if (Date.now() < maptilerInvalidUntil) return false
  return true
}

export function markMapTilerFailed(): void {
  maptilerInvalidUntil = Date.now() + COOLDOWN_MS
}
