import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { STORAGE_KEYS } from '@/constants/storage-keys'
import type { LoginResponse, User } from '@/types/auth'

function readStoredUser(): User | null {
  const rawUser = localStorage.getItem(STORAGE_KEYS.authUser)

  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser) as User
  } catch {
    localStorage.removeItem(STORAGE_KEYS.authUser)
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)
  const hasHydrated = ref(false)

  const isAuthenticated = computed(() => Boolean(accessToken.value))

  function setAccessToken(token: string | null): void {
    accessToken.value = token

    if (token) {
      localStorage.setItem(STORAGE_KEYS.accessToken, token)
      return
    }

    localStorage.removeItem(STORAGE_KEYS.accessToken)
  }

  function setUser(nextUser: User | null): void {
    user.value = nextUser

    if (nextUser) {
      localStorage.setItem(STORAGE_KEYS.authUser, JSON.stringify(nextUser))
      return
    }

    localStorage.removeItem(STORAGE_KEYS.authUser)
  }

  function setAuth(payload: LoginResponse): void {
    setAccessToken(payload.accessToken)
    setUser(payload.user)
  }

  function restoreFromStorage(): void {
    accessToken.value = localStorage.getItem(STORAGE_KEYS.accessToken)
    user.value = readStoredUser()
    hasHydrated.value = true
  }

  function clearAuth(): void {
    setAccessToken(null)
    setUser(null)
  }

  return {
    user,
    accessToken,
    hasHydrated,
    isAuthenticated,
    setAccessToken,
    setUser,
    setAuth,
    restoreFromStorage,
    clearAuth,
  }
})
