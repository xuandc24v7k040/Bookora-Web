import { defineStore } from 'pinia'
import { ref } from 'vue'
import { STORAGE_KEYS } from '@/constants/storage-key.constant'

export const useUiStore = defineStore('ui', () => {
  const sidebarCollapsed = ref(
    localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === 'true',
  )

  function setSidebarCollapsed(value: boolean): void {
    sidebarCollapsed.value = value
    localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, String(value))
  }

  function toggleSidebar(): void {
    setSidebarCollapsed(!sidebarCollapsed.value)
  }

  return {
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
  }
})
