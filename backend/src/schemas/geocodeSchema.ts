import { z } from 'zod'

export const geocodeQuerySchema = z.object({
  query: z
    .string()
    .min(2, 'query must be at least 2 characters'),
})

export type GeocodeQuery = z.infer<typeof geocodeQuerySchema>
