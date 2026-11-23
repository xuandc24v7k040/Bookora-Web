import { computed, type Ref } from "vue";
import { useTimeBoundaryRefetch } from "@/composables/use-time-boundary-refetch";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import {
  adminCouponsCreate,
  adminCouponsDetail,
  adminCouponsList,
  adminCouponsSetActive,
  adminCouponsUpdate,
} from "@/api/generated/endpoints/admin-coupons/admin-coupons";
import type {
  AdminCouponsListParams,
  SaveCouponDto,
} from "@/api/generated/models";

export function useAdminCoupons(params: Ref<AdminCouponsListParams>) {
  const client = useQueryClient();
  let requestStartedAt = 0;
  const query = useQuery({
    queryKey: computed(() => ["admin-coupons", params.value]),
    queryFn: async ({ signal }) => {
      requestStartedAt = performance.now();
      return (await adminCouponsList(params.value, undefined, signal)).data;
    },
    placeholderData: keepPreviousData,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
  useTimeBoundaryRefetch({
    metadata: () => query.isPlaceholderData.value ? undefined : query.data.value,
    fetching: query.isFetching,
    requestStartedAt: () => requestStartedAt,
    refetch: () => query.refetch({ cancelRefetch: false }),
  });
  const save = useMutation({
    mutationFn: ({ id, data }: { id?: string; data: SaveCouponDto }) =>
      id ? adminCouponsUpdate(id, data) : adminCouponsCreate(data),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });
  const active = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminCouponsSetActive(id, { isActive }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });
  return {
    query,
    save,
    active,
    detail: async (id: string) => (await adminCouponsDetail(id)).data,
  };
}
