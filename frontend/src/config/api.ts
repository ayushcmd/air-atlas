/**
 * Base URL for API requests.
 * In local dev (or same-origin Pages proxy), defaults to empty string (relative URL /api/...).
 * When deployed to Cloudflare Pages pointing to a separate Worker, set VITE_API_BASE_URL.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${cleanPath}`
}
