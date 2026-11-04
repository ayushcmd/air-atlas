import dotenv from 'dotenv'

// Load environment variables FIRST, before any other imports
dotenv.config()

import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { connectRedis } from './config/redis'
import { connectInflux } from './config/influx'
import { errorHandler } from './middleware/error'
import { apiLimiter, searchLimiter, exportLimiter } from './middleware/rateLimiter'
import { logger } from './utils/logger'
import { setupSocketIO } from './socket/socketService'
import weatherRoutes from './routes/weatherRoutes'
import geocodeRoutes from './routes/geocodeRoutes'
import airQualityRoutes from './routes/airQualityRoutes'
import tileRoutes from './routes/tileRoutes'
import historyRoutes from './routes/historyRoutes'
import usageRoutes from './routes/usageRoutes'

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT ?? 5000

// Middleware
app.use(helmet({ crossOriginEmbedderPolicy: false }))
app.use(compression())
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' }))
app.use(express.json())
app.use('/api', apiLimiter)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.get('/api', (_req, res) => {
  res.json({ message: 'Climate Tracker API', version: '1.0.0' })
})
app.use('/api/weather', weatherRoutes)
app.use('/api/geocode', searchLimiter, geocodeRoutes)
app.use('/api/air-quality', airQualityRoutes)
app.use('/api/tiles', tileRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/history/export', exportLimiter)
app.use('/api/usage', usageRoutes)

// Global error handler — must be last
app.use(errorHandler)

// Socket.IO — attach to the HTTP server
const io = setupSocketIO(httpServer)
export { io }

httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`)
})

connectRedis()
connectInflux()

export default app
