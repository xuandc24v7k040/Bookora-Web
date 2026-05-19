import { envSchema } from '@/schemas/env.schema'

const parsedEnv = envSchema.parse(import.meta.env)

export const env = {
  apiBaseUrl: parsedEnv.VITE_API_BASE_URL,
} as const
