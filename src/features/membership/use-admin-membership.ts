import { computed, type Ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  adminMembershipConfig,
  adminMembershipMembers,
  adminMembershipUpdateConfig,
} from '@/api/generated/endpoints/admin-membership/admin-membership'
import type {
  AdminMembershipMembersParams,
  UpdateMembershipThresholdsDto,
} from '@/api/generated/models'
import { useAuthStore } from '@/stores/auth.store'

export function useAdminMembership(params: Ref<AdminMembershipMembersParams>) {
  const auth = useAuthStore(),
    client = useQueryClient()
  const enabled = computed(() => auth.user?.isSuperAdmin === true)
  const base = computed(() => ['admin-membership', auth.user?.id])
  const members = useQuery({
    queryKey: computed(() => [...base.value, 'members', params.value]),
    queryFn: async ({ signal }) =>
      (
        await adminMembershipMembers(
          params.value,
          { branchScoped: false },
          signal,
        )
      ).data,
    enabled,
  })
  const config = useQuery({
    queryKey: computed(() => [...base.value, 'config']),
    queryFn: async ({ signal }) =>
      (await adminMembershipConfig({ branchScoped: false }, signal)).data,
    enabled,
    refetchInterval: (query) => (query.state.data?.pending ? 2000 : false),
  })
  const save = useMutation({
    mutationFn: (data: UpdateMembershipThresholdsDto) =>
      adminMembershipUpdateConfig(data, { branchScoped: false }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['admin-membership'] }),
        client.invalidateQueries({ queryKey: ['membership'] }),
      ])
    },
  })
  return { members, config, save }
}
