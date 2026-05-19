import { z } from 'zod'
import { loginSchema } from '@/schemas/auth.schema'

export type AdminRole = 'SUPER_ADMIN' | 'BRANCH_ADMIN'
export type BranchId = 'can-tho' | 'hau-giang'
export type ManagementScope = 'all' | BranchId

export interface User {
  id: string
  email: string
  name: string
  role?: AdminRole
  branchId?: BranchId | null
  branchName?: string | null
  scopes?: ManagementScope[]
  avatarUrl?: string | null
}

export type LoginRequest = z.infer<typeof loginSchema>

export interface LoginResponse {
  user: User
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
