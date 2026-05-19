import { z } from 'zod'
import { loginSchema } from '@/schemas/auth.schema'

export interface User {
  id: string
  email: string
  name: string
  role?: string
  avatarUrl?: string | null
}

export type LoginRequest = z.infer<typeof loginSchema>

export interface LoginResponse {
  user: User
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

export type AdminRole = 'SUPER_ADMIN' | 'BRANCH_ADMIN'
