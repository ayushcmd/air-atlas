import { z } from 'zod'

export const weatherParamsSchema = z.object({
  lat: z.coerce.number().min(-90, 'lat must be >= -90').max(90, 'lat must be <= 90'),
  lon: z.coerce.number().min(-180, 'lon must be >= -180').max(180, 'lon must be <= 180'),
})

export type WeatherParams = z.infer<typeof weatherParamsSchema>
