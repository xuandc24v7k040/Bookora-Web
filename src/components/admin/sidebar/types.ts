import type { LucideIcon } from 'lucide-vue-next'

export interface SidebarNavChild {
  title: string
  url: string
}

export interface SidebarNavItem {
  title: string
  url?: string
  icon: LucideIcon
  children?: SidebarNavChild[]
}
