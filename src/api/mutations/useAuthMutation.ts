import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import { authKeys } from '@/api/keys/auth.key'
import { authApi } from '@/api/modules/auth.api'
import { useAuthStore } from '@/stores/auth.store'
import type { LoginRequest } from '@/types/auth.type'

export function useLoginMutation() {
  const authStore = useAuthStore()
  const queryClient = useQueryClient()
  const route = useRoute()
  const router = useRouter()

  return useMutation({
    mutationFn: (payload: LoginRequest) => authApi.login(payload),
    onSuccess: async (data) => {
      authStore.setAuthenticated(data.user)
      queryClient.setQueryData(authKeys.me, data.user)

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
    mutationFn: authApi.logout,
    onSettled: async () => {
      authStore.setUnauthenticated()
      queryClient.clear()
      await router.replace({ name: 'login' })
    },
  })
}
