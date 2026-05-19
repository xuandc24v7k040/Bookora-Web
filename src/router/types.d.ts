import 'vue-router'
import type { AdminRole } from '@/types/auth.type'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    role?: AdminRole
  }
}
