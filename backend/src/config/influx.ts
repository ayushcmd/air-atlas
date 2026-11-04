import { InfluxDB } from '@influxdata/influxdb-client'
import { logger } from '../utils/logger'

/* ── Environment ────────────────────────────────────────────────────────── */

const INFLUXDB_URL = process.env.INFLUXDB_URL ?? 'http://localhost:8086'
const INFLUXDB_TOKEN = process.env.INFLUXDB_TOKEN ?? ''
export const INFLUXDB_ORG = process.env.INFLUXDB_ORG ?? 'climate-tracker'
export const INFLUXDB_BUCKET = process.env.INFLUXDB_BUCKET ?? 'climate'

/* ── Client singleton ───────────────────────────────────────────────────── */

let influxClient: InfluxDB | null = null

/**
 * Returns the InfluxDB client singleton.
 * Creates the client lazily on first call.
 */
export function getInfluxClient(): InfluxDB | null {
  if (!INFLUXDB_TOKEN) {
    logger.warn('[InfluxDB] No INFLUXDB_TOKEN configured — writes disabled')
    return null
  }

  if (!influxClient) {
    influxClient = new InfluxDB({ url: INFLUXDB_URL, token: INFLUXDB_TOKEN })
    logger.info(`[InfluxDB] Client created → ${INFLUXDB_URL}`)
  }

  return influxClient
}

/**
 * Verify connectivity by attempting a simple query.
 * Gracefully degrades — logs a warning instead of crashing.
 */
export async function connectInflux(): Promise<void> {
  const client = getInfluxClient()
  if (!client) return

  try {
    const queryApi = client.getQueryApi(INFLUXDB_ORG)
    // Run a trivial query to verify the connection
    const rows: unknown[] = []
    await new Promise<void>((resolve, reject) => {
      queryApi.queryRows('buckets()', {
        next: (_row, _meta) => { rows.push(_row) },
        error: (err) => reject(err),
        complete: () => resolve(),
      })
    })
    logger.info(`[InfluxDB] Connected — org: ${INFLUXDB_ORG}, bucket: ${INFLUXDB_BUCKET}`)
  } catch (err) {
    logger.warn('[InfluxDB] Failed to connect — time-series writes disabled:', (err as Error).message)
  }
}
