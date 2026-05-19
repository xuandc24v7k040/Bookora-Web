import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { authKeys } from '@/api/keys/auth.key'
import { authApi } from '@/api/modules/auth.api'
import { useAuthStore } from '@/stores/auth.store'

export function useMeQuery() {
  const authStore = useAuthStore()

  return useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.me,
    enabled: computed(() => authStore.isAuthenticated),
  })
}
