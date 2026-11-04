import { redis } from '../config/redis'

/* ── Free-tier limits ────────────────────────────────────────────────────── */

export const OWM_DAILY_LIMIT = 1_000
export const OWM_MINUTE_LIMIT = 60
export const MAPTILER_MONTHLY_LIMIT = 10_000

/**
 * Start blocking new calls at 95 % to guarantee staying under limits.
 * A small buffer handles in-flight concurrent requests.
 */
const OWM_DAILY_GUARD = Math.floor(OWM_DAILY_LIMIT * 0.95)
const MAPTILER_MONTHLY_GUARD = Math.floor(MAPTILER_MONTHLY_LIMIT * 0.95)

/* ── Key helpers ─────────────────────────────────────────────────────────── */

const todayKey = () => new Date().toISOString().slice(0, 10)          // YYYY-MM-DD
const monthKey = () => new Date().toISOString().slice(0, 7)           // YYYY-MM
const minuteKey = () => Math.floor(Date.now() / 60_000).toString()   // epoch-minute

/* ── Tracking & guard ────────────────────────────────────────────────────── */

/**
 * Increment OWM API call counter(s) in Redis and throw a 429 error if the
 * daily guard threshold is exceeded. Call this BEFORE making the real API request.
 *
 * @param count Number of OWM API calls about to be made (e.g. 2 for weather = current + forecast)
 */
export async function trackOWMCall(count = 1): Promise<void> {
  if (!redis.isReady) return

  const dayKey = `usage:owm:daily:${todayKey()}`
  const minKey = `usage:owm:min:${minuteKey()}`

  const [daily] = await Promise.all([
    redis.incrBy(dayKey, count).then(async (n) => {
      if (n === count) await redis.expire(dayKey, 86_400)
      return n
    }),
    redis.incrBy(minKey, count).then(async (n) => {
      if (n === count) await redis.expire(minKey, 120)
      return n
    }),
  ])

  if (daily > OWM_DAILY_GUARD) {
    const err = new Error(
      `OpenWeatherMap daily limit almost reached (${daily}/${OWM_DAILY_LIMIT}). ` +
        'Requests are paused to protect your free-tier API key. Resets at midnight UTC.',
    ) as Error & { status: number }
    err.status = 429
    throw err
  }
}

/**
 * Increment MapTiler API call counter in Redis and throw if the monthly guard
 * threshold is exceeded.
 */
export async function trackMapTilerCall(): Promise<void> {
  if (!redis.isReady) return

  const key = `usage:maptiler:monthly:${monthKey()}`

  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, 32 * 86_400)

  if (count > MAPTILER_MONTHLY_GUARD) {
    const err = new Error(
      `MapTiler monthly limit almost reached (${count}/${MAPTILER_MONTHLY_LIMIT}). ` +
        'Geocode requests are paused to protect your free-tier API key.',
    ) as Error & { status: number }
    err.status = 429
    throw err
  }
}

/* ── Snapshot for the /api/usage endpoint ────────────────────────────────── */

export interface UsageSnapshot {
  owm: {
    daily: number
    minutely: number
    dailyLimit: number
    minuteLimit: number
    dailyGuard: number
  }
  maptiler: {
    monthly: number
    monthlyLimit: number
    monthlyGuard: number
  }
}

export async function getUsageSnapshot(): Promise<UsageSnapshot> {
  const empty: UsageSnapshot = {
    owm: { daily: 0, minutely: 0, dailyLimit: OWM_DAILY_LIMIT, minuteLimit: OWM_MINUTE_LIMIT, dailyGuard: OWM_DAILY_GUARD },
    maptiler: { monthly: 0, monthlyLimit: MAPTILER_MONTHLY_LIMIT, monthlyGuard: MAPTILER_MONTHLY_GUARD },
  }

  if (!redis.isReady) return empty

  const [owmDaily, owmMin, maptilerMonthly] = await Promise.all([
    redis.get(`usage:owm:daily:${todayKey()}`).then((v) => parseInt(v ?? '0', 10)),
    redis.get(`usage:owm:min:${minuteKey()}`).then((v) => parseInt(v ?? '0', 10)),
    redis.get(`usage:maptiler:monthly:${monthKey()}`).then((v) => parseInt(v ?? '0', 10)),
  ])

  return {
    owm: {
      daily: owmDaily,
      minutely: owmMin,
      dailyLimit: OWM_DAILY_LIMIT,
      minuteLimit: OWM_MINUTE_LIMIT,
      dailyGuard: OWM_DAILY_GUARD,
    },
    maptiler: {
      monthly: maptilerMonthly,
      monthlyLimit: MAPTILER_MONTHLY_LIMIT,
      monthlyGuard: MAPTILER_MONTHLY_GUARD,
    },
  }
}
