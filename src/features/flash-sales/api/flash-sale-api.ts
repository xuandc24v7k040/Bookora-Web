import { computed, type Ref } from "vue";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import {
  adminFlashSalesCreate,
  adminFlashSalesUpdate,
  adminFlashSalesList,
  adminFlashSalesDetail,
  adminFlashSalesControl,
  adminFlashSalesVariants,
} from "@/api/generated/endpoints/admin-flash-sales/admin-flash-sales";
import {
  customerFlashSaleEligibility,
  storefrontFlashSaleEligibility,
  storefrontFlashSalesList,
} from "@/api/generated/endpoints/storefront-flash-sales/storefront-flash-sales";
import type {
  AdminFlashSalesListParams,
  FlashSaleControlDto,
  SaveFlashSaleDto,
  StorefrontFlashSalesListParams,
} from "@/api/generated/models";

export function useAdminFlashSales(params: Ref<AdminFlashSalesListParams>) {
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: computed(() => ["admin-flash-sales", params.value]),
    queryFn: async ({ signal }) =>
      (await adminFlashSalesList(params.value, undefined, signal)).data,
    placeholderData: keepPreviousData,
  });
  async function invalidate() {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ["admin-flash-sales"] }),
      cache.invalidateQueries({ queryKey: ["flash-sales"] }),
    ]);
  }
  return {
    query,
    detail: async (id: string) => (await adminFlashSalesDetail(id)).data,
    save: async (data: SaveFlashSaleDto, id?: string) => {
      const response = id
        ? await adminFlashSalesUpdate(id, data)
        : await adminFlashSalesCreate(data);
      await invalidate();
      return response.data;
    },
    control: async (id: string, data: FlashSaleControlDto) => {
      await adminFlashSalesControl(id, data);
      await invalidate();
    },
  };
}
export function useFlashSales(params: Ref<StorefrontFlashSalesListParams>) {
  return useQuery({
    queryKey: computed(() => ["flash-sales", "list", params.value]),
    queryFn: async ({ signal }) =>
      (await storefrontFlashSalesList(params.value, undefined, signal)).data,
    refetchInterval: 60_000,
    refetchOnWindowFocus: "always",
    staleTime: 15_000,
  });
}
export function useFlashEligibility(
  variantId: Ref<string>,
  userId: Ref<string | undefined>,
) {
  return useQuery({
    queryKey: computed(() => [
      "flash-sales",
      "variant",
      variantId.value,
      userId.value ?? "guest",
    ]),
    queryFn: async ({ signal }) =>
      (
        await (userId.value
          ? customerFlashSaleEligibility(variantId.value, undefined, signal)
          : storefrontFlashSaleEligibility(variantId.value, undefined, signal))
      ).data,
    enabled: computed(() => Boolean(variantId.value)),
    refetchInterval: 30_000,
    refetchOnWindowFocus: "always",
    staleTime: 0,
  });
}
export async function listFlashVariants(
  params: { page: number; search?: string },
  signal?: AbortSignal,
) {
  return (
    await adminFlashSalesVariants({ ...params, limit: 20 }, undefined, signal)
  ).data;
}
