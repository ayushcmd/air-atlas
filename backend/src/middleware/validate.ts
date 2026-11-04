import type { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

type RequestSection = 'body' | 'query' | 'params'

/**
 * Returns an Express middleware that validates the given section of the request
 * against the provided Zod schema. On failure it returns a 400 JSON response.
 */
export function validate<T>(schema: ZodSchema<T>, section: RequestSection = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[section])

    if (!result.success) {
      const errors = (result.error as ZodError).issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      res.status(400).json({ error: 'Validation failed', details: errors })
      return
    }

    // Overwrite the section with the parsed (and potentially coerced) value
    ;(req as unknown as Record<string, unknown>)[section] = result.data
    next()
  }
}
