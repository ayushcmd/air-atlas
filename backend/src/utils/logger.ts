import { createLogger, format, transports } from 'winston'

const { combine, timestamp, colorize, printf, json } = format

const isDev = process.env.NODE_ENV !== 'production'

/** Human-readable format for development */
const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
    return `${timestamp} [${level}] ${message}${extra}`
  }),
)

/** Structured JSON format for production */
const prodFormat = combine(timestamp(), json())

export const logger = createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: isDev ? devFormat : prodFormat,
  transports: [new transports.Console()],
})
