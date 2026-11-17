import { computed, type Ref } from "vue";
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
  const query = useQuery({
    queryKey: computed(() => ["admin-coupons", params.value]),
    queryFn: async ({ signal }) =>
      (await adminCouponsList(params.value, undefined, signal)).data,
    placeholderData: keepPreviousData,
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
