import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { STORAGE_KEYS } from '@/constants/storage-keys'

export type Theme = 'light' | 'dark' | 'system'

function getSystemTheme(): Exclude<Theme, 'system'> {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>('system')

  const resolvedTheme = computed(() => {
    return theme.value === 'system' ? getSystemTheme() : theme.value
  })

  function applyTheme(): void {
    document.documentElement.classList.toggle('dark', resolvedTheme.value === 'dark')
  }

  function setTheme(nextTheme: Theme): void {
    theme.value = nextTheme
    localStorage.setItem(STORAGE_KEYS.theme, nextTheme)
    applyTheme()
  }

  function initTheme(): void {
    const storedTheme = localStorage.getItem(STORAGE_KEYS.theme) as Theme | null
    theme.value = storedTheme ?? 'system'
    applyTheme()
  }

  return {
    theme,
    resolvedTheme,
    setTheme,
    initTheme,
  }
})
