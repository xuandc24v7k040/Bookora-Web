import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { STORAGE_KEYS } from '@/constants/storage-key.constant'
import type { AdminRole, AuthStatus, BranchId, ManagementScope, User } from '@/types/auth.type'

interface MockAdminAccount {
  email: string
  password: string
  role: AdminRole
  name: string
  branchId: BranchId | null
  branchName: string | null
  scopes: ManagementScope[]
}

interface StoredAuthState {
  email: string
  role: AdminRole
  name: string
  branchId: BranchId | null
  branchName: string | null
  scopes: ManagementScope[]
}

export const MOCK_ADMIN_ACCOUNTS: MockAdminAccount[] = [
  {
    email: 'xuandc24v7k040@gmail.com',
    password: 'password',
    role: 'SUPER_ADMIN',
    name: 'Super Admin',
    branchId: null,
    branchName: null,
    scopes: ['all', 'can-tho', 'hau-giang'],
  },
  {
    email: 'hg@gmail.com',
    password: 'password',
    role: 'BRANCH_ADMIN',
    name: 'Admin Hậu Giang',
    branchId: 'hau-giang',
    branchName: 'Chi nhánh Hậu Giang',
    scopes: ['hau-giang'],
  },
  {
    email: 'ct@gmail.com',
    password: 'password',
    role: 'BRANCH_ADMIN',
    name: 'Admin Cần Thơ',
    branchId: 'can-tho',
    branchName: 'Chi nhánh Cần Thơ',
    scopes: ['can-tho'],
  },
]

function isBranchId(value: unknown): value is BranchId {
  return value === 'can-tho' || value === 'hau-giang'
}

function isManagementScope(value: unknown): value is ManagementScope {
  return value === 'all' || isBranchId(value)
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
      typeof parsedValue.name === 'string' &&
      (parsedValue.role === 'SUPER_ADMIN' || parsedValue.role === 'BRANCH_ADMIN') &&
      (parsedValue.branchId === null || isBranchId(parsedValue.branchId)) &&
      Array.isArray(parsedValue.scopes) &&
      parsedValue.scopes.every(isManagementScope)
    ) {
      return {
        email: parsedValue.email,
        role: parsedValue.role,
        name: parsedValue.name,
        branchId: parsedValue.branchId ?? null,
        branchName: parsedValue.branchName ?? null,
        scopes: parsedValue.scopes,
      }
    }
  } catch {
    localStorage.removeItem(STORAGE_KEYS.auth)
  }

  return null
}

function toStoredAuth(account: MockAdminAccount): StoredAuthState {
  return {
    email: account.email,
    role: account.role,
    name: account.name,
    branchId: account.branchId,
    branchName: account.branchName,
    scopes: account.scopes,
  }
}

export const useAuthStore = defineStore('auth', () => {
  const storedAuth = readStoredAuth()
  const email = ref(storedAuth?.email ?? '')
  const name = ref(storedAuth?.name ?? '')
  const role = ref<AdminRole | null>(storedAuth?.role ?? null)
  const branchId = ref<BranchId | null>(storedAuth?.branchId ?? null)
  const branchName = ref<string | null>(storedAuth?.branchName ?? null)
  const scopes = ref<ManagementScope[]>(storedAuth?.scopes ?? [])
  const authStatus = ref<AuthStatus>(storedAuth ? 'authenticated' : 'unauthenticated')
  const loginError = ref<string | null>(null)

  const isAuthenticated = computed(() => authStatus.value === 'authenticated' && role.value !== null)
  const user = computed<User | null>(() => {
    if (!isAuthenticated.value || !role.value) {
      return null
    }

    return {
      id: email.value,
      email: email.value,
      name: name.value,
      role: role.value,
      branchId: branchId.value,
      branchName: branchName.value,
      scopes: scopes.value,
      avatarUrl: null,
    }
  })

  function setLoading(): void {
    authStatus.value = 'loading'
  }

  function setAuthState(nextAuth: StoredAuthState): void {
    email.value = nextAuth.email
    name.value = nextAuth.name
    role.value = nextAuth.role
    branchId.value = nextAuth.branchId
    branchName.value = nextAuth.branchName
    scopes.value = nextAuth.scopes
    authStatus.value = 'authenticated'
    loginError.value = null
    localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(nextAuth))
  }

  function login(payload: { email: string; password?: string }): boolean {
    const normalizedEmail = payload.email.trim().toLowerCase()
    const account = MOCK_ADMIN_ACCOUNTS.find((item) => item.email === normalizedEmail)

    if (!account || (payload.password && payload.password !== account.password)) {
      loginError.value = 'Email hoặc mật khẩu mock không hợp lệ.'
      return false
    }

    setAuthState(toStoredAuth(account))
    return true
  }

  function setAuthenticated(nextUser: User): void {
    const nextRole = nextUser.role === 'SUPER_ADMIN' || nextUser.role === 'BRANCH_ADMIN'
      ? nextUser.role
      : 'SUPER_ADMIN'

    setAuthState({
      email: nextUser.email,
      role: nextRole,
      name: nextUser.name,
      branchId: nextUser.branchId ?? null,
      branchName: nextUser.branchName ?? null,
      scopes: nextUser.scopes ?? (nextRole === 'SUPER_ADMIN' ? ['all', 'can-tho', 'hau-giang'] : []),
    })
  }

  function logout(): void {
    email.value = ''
    name.value = ''
    role.value = null
    branchId.value = null
    branchName.value = null
    scopes.value = []
    authStatus.value = 'unauthenticated'
    loginError.value = null
    localStorage.removeItem(STORAGE_KEYS.auth)
  }

  function setUnauthenticated(): void {
    logout()
  }

  return {
    user,
    email,
    name,
    role,
    branchId,
    branchName,
    scopes,
    authStatus,
    loginError,
    isAuthenticated,
    setLoading,
    login,
    setAuthenticated,
    logout,
    setUnauthenticated,
  }
})
