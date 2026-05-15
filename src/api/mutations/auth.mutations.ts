import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import { queryKeys } from '@/constants/query-keys'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import type { LoginRequest } from '@/types/auth'

export function useLoginMutation() {
  const authStore = useAuthStore()
  const queryClient = useQueryClient()
  const route = useRoute()
  const router = useRouter()

  return useMutation({
    mutationFn: (payload: LoginRequest) => authService.login(payload),
    onSuccess: async (data) => {
      authStore.setAuth(data)
      queryClient.setQueryData(queryKeys.auth.me, data.user)

      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
      await router.replace(redirect ?? { name: 'dashboard' })
    },
  })
}

export function useLogoutMutation() {
  const authStore = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: authService.logout,
    onSettled: async () => {
      authStore.clearAuth()
      queryClient.clear()
      await router.replace({ name: 'login' })
    },
  })
}
