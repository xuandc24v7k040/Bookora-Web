import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { STORAGE_KEYS } from '@/constants/storage-key.constant'
import type { AdminRole, AuthStatus, User } from '@/types/auth.type'

interface StoredAuthState {
  email: string
  role: AdminRole
}

function readStoredAuth(): StoredAuthState | null {
  const rawValue = localStorage.getItem(STORAGE_KEYS.auth)

  if (!rawValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<StoredAuthState>

    if (
      typeof parsedValue.email === 'string' &&
      (parsedValue.role === 'SUPER_ADMIN' || parsedValue.role === 'BRANCH_ADMIN')
    ) {
      return {
        email: parsedValue.email,
        role: parsedValue.role,
      }
    }
  } catch {
    localStorage.removeItem(STORAGE_KEYS.auth)
  }

  return null
}

export const useAuthStore = defineStore('auth', () => {
  const storedAuth = readStoredAuth()
  const email = ref(storedAuth?.email ?? '')
  const role = ref<AdminRole | null>(storedAuth?.role ?? null)
  const authStatus = ref<AuthStatus>(storedAuth ? 'authenticated' : 'unauthenticated')

  const isAuthenticated = computed(() => authStatus.value === 'authenticated' && role.value !== null)
  const user = computed<User | null>(() => {
    if (!isAuthenticated.value || !role.value) {
      return null
    }

    return {
      id: role.value.toLowerCase(),
      email: email.value,
      name: email.value,
      role: role.value,
      avatarUrl: null,
    }
  })

  function setLoading(): void {
    authStatus.value = 'loading'
  }

  function login(payload: { email: string; role: AdminRole }): void {
    email.value = payload.email
    role.value = payload.role
    authStatus.value = 'authenticated'
    localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(payload))
  }

  function setAuthenticated(nextUser: User): void {
    const nextRole = nextUser.role === 'SUPER_ADMIN' || nextUser.role === 'BRANCH_ADMIN'
      ? nextUser.role
      : 'SUPER_ADMIN'

    login({
      email: nextUser.email,
      role: nextRole,
    })
  }

  function logout(): void {
    email.value = ''
    role.value = null
    authStatus.value = 'unauthenticated'
    localStorage.removeItem(STORAGE_KEYS.auth)
  }

  function setUnauthenticated(): void {
    logout()
  }

  return {
    user,
    email,
    role,
    authStatus,
    isAuthenticated,
    setLoading,
    login,
    setAuthenticated,
    logout,
    setUnauthenticated,
  }
})
