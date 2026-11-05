/**
 * Base URL for API requests.
 * In local dev (or same-origin Pages proxy), defaults to empty string (relative URL /api/...).
 * When deployed to Cloudflare Pages pointing to a separate Worker, set VITE_API_BASE_URL.
 * If VITE_API_BASE_URL is omitted in production, it safely defaults to the production Worker.
 */
export const PRODUCTION_WORKER_API = 'https://air-atlas-api.ayushcmd08.workers.dev'

const envBase = import.meta.env.VITE_API_BASE_URL
export const API_BASE = (
  envBase && envBase.trim() !== ''
    ? envBase
    : (import.meta.env.PROD ? PRODUCTION_WORKER_API : '')
).replace(/\/+$/, '')

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${cleanPath}`
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Shared, robust JSON fetch helper that guards against HTML SPA fallbacks,
 * non-JSON payloads, and server errors while preserving clear error messages.
 */
export async function fetchJson<T>(input: string | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  if (!res.ok) {
    let errorMsg = `API request failed (${res.status})`
    if (isJson) {
      try {
        const body = await res.json()
        if (body && typeof body.message === 'string') {
          errorMsg = body.message
        } else if (body && typeof body.error === 'string') {
          errorMsg = body.error
        }
      } catch {
        // Fall back to default errorMsg
      }
    } else if (contentType.includes('text/html')) {
      errorMsg = `API returned HTML error page (${res.status}) instead of JSON`
    }
    throw new ApiError(errorMsg, res.status)
  }

  if (!isJson) {
    if (contentType.includes('text/html')) {
      throw new ApiError(
        'Expected JSON response from API, but received HTML (check API URL configuration)',
        res.status,
      )
    }
    throw new ApiError(
      `Expected JSON response from API, but received ${contentType || 'non-JSON response'}`,
      res.status,
    )
  }

  try {
    return (await res.json()) as T
  } catch {
    throw new ApiError('Failed to parse API JSON response', res.status)
  }
}
