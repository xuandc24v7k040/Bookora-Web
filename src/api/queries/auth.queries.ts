import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { queryKeys } from '@/constants/query-keys'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'

export function useMeQuery() {
  const authStore = useAuthStore()

  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authService.me,
    enabled: computed(() => authStore.isAuthenticated),
  })
}
