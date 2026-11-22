import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import {
  myMembership,
  myMembershipCoupons,
  myMembershipTransactions,
} from '@/api/generated/endpoints/membership/membership'
import { useAuthStore } from '@/stores/auth.store'

export function useMembership() {
  const auth = useAuthStore()
  return useQuery({
    queryKey: computed(() => ['membership', auth.user?.id, 'summary']),
    queryFn: async ({ signal }) =>
      (await myMembership({ branchScoped: false }, signal)).data,
    enabled: computed(() => auth.user?.type === 'CUSTOMER'),
    staleTime: 15000,
    refetchOnWindowFocus: 'always',
    retry: false,
  })
}
export function useMembershipCoupons(
  page: MaybeRefOrGetter<number>,
  limit: number,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const auth = useAuthStore()
  const common = {
    queryKey: computed(() => [
      'membership',
      auth.user?.id,
      'coupons',
      toValue(page),
      limit,
    ]),
    enabled: computed(() => auth.user?.type === 'CUSTOMER' && toValue(enabled)),
    staleTime: 15000,
    refetchOnWindowFocus: 'always' as const,
    retry: false,
  }
  return useQuery({
    ...common,
    queryFn: async ({ signal }) =>
      (
        await myMembershipCoupons(
          { page: toValue(page), limit },
          { branchScoped: false },
          signal,
        )
      ).data,
  })
}
export function useMembershipTransactions(
  page: MaybeRefOrGetter<number>,
  limit: number,
) {
  const auth = useAuthStore()
  return useQuery({
    queryKey: computed(() => [
      'membership',
      auth.user?.id,
      'transactions',
      toValue(page),
      limit,
    ]),
    queryFn: async ({ signal }) =>
      (
        await myMembershipTransactions(
          { page: toValue(page), limit },
          { branchScoped: false },
          signal,
        )
      ).data,
    enabled: computed(() => auth.user?.type === 'CUSTOMER'),
    staleTime: 15000,
    refetchOnWindowFocus: 'always',
    retry: false,
  })
}
