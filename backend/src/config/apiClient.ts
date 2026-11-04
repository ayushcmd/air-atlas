import axios from 'axios'
import https from 'https'
import http from 'http'

/**
 * Pre-configured axios instance for outbound API requests.
 *
 * Forces IPv4 to avoid ETIMEDOUT issues on systems where IPv6 routes
 * to external APIs are unreachable (common when Docker is running).
 */
export const apiClient = axios.create({
  timeout: 15_000,
  httpAgent: new http.Agent({ family: 4 }),
  httpsAgent: new https.Agent({ family: 4 }),
})
