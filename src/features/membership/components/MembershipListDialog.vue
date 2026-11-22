<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useQuery } from "@tanstack/vue-query";
import {
  myMembershipCoupons,
  myMembershipTransactions,
} from "@/api/generated/endpoints/membership/membership";
import { useAuthStore } from "@/stores/auth.store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MembershipCouponCard from "./MembershipCouponCard.vue";
import MembershipTransactionRow from "./MembershipTransactionRow.vue";
const props = defineProps<{
  open: boolean;
  kind: "coupons" | "transactions";
}>();
const emit = defineEmits<{ "update:open": [value: boolean] }>();
const page = ref(1),
  auth = useAuthStore();
watch(
  () => props.open,
  (open) => {
    if (open) page.value = 1;
  },
);
const title = computed(() =>
  props.kind === "coupons"
    ? "Tất cả ưu đãi của bạn"
    : "Toàn bộ lịch sử tích lũy",
);
const coupons = useQuery({
  queryKey: computed(() => [
    "membership",
    auth.user?.id,
    "coupons",
    page.value,
    10,
  ]),
  queryFn: async ({ signal }) =>
    (
      await myMembershipCoupons(
        { page: page.value, limit: 10 },
        { branchScoped: false },
        signal,
      )
    ).data,
  enabled: computed(
    () =>
      props.open && props.kind === "coupons" && auth.user?.type === "CUSTOMER",
  ),
  retry: false,
});
const transactions = useQuery({
  queryKey: computed(() => [
    "membership",
    auth.user?.id,
    "transactions",
    page.value,
    10,
  ]),
  queryFn: async ({ signal }) =>
    (
      await myMembershipTransactions(
        { page: page.value, limit: 10 },
        { branchScoped: false },
        signal,
      )
    ).data,
  enabled: computed(
    () =>
      props.open &&
      props.kind === "transactions" &&
      auth.user?.type === "CUSTOMER",
  ),
  retry: false,
});
const selected = computed(() =>
  props.kind === "coupons" ? coupons : transactions,
);
const count = computed(() => selected.value.data.value?.totalItems ?? 0);
const pages = computed(() => selected.value.data.value?.totalPages ?? 1);
</script>
<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="bookora-client membership-client flex h-[min(740px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
    >
      <DialogHeader class="shrink-0 border-b p-5 pr-12 text-left"
        ><DialogTitle>{{ title }}</DialogTitle
        ><DialogDescription>{{
          kind === "coupons"
            ? "Điều kiện đơn hàng và lượt sử dụng được kiểm tra khi thanh toán."
            : "Chỉ ghi nhận tiền hàng hợp lệ của đơn hoàn tất và đã thanh toán."
        }}</DialogDescription></DialogHeader
      >
      <ScrollArea class="min-h-0 flex-1 overflow-hidden"
        ><div class="space-y-3 p-5">
          <template v-if="selected.isPending.value"
            ><Skeleton v-for="n in 3" :key="n" class="h-24 w-full"
          /></template>
          <div
            v-else-if="selected.isError.value"
            role="alert"
            class="space-y-3 text-sm"
          >
            <p>Không thể tải dữ liệu. Vui lòng thử lại.</p>
            <Button
              variant="outline"
              class="cursor-pointer"
              @click="selected.refetch()"
              >Thử lại</Button
            >
          </div>
          <template v-else-if="kind === 'coupons'"
            ><MembershipCouponCard
              v-for="coupon in coupons.data.value?.items ?? []"
              :key="coupon.id"
              :coupon="coupon"
          /></template>
          <template v-else
            ><MembershipTransactionRow
              v-for="transaction in transactions.data.value?.items ?? []"
              :key="transaction.id"
              :transaction="transaction"
          /></template>
          <p
            v-if="
              !selected.isPending.value && !selected.isError.value && !count
            "
            class="py-10 text-center text-sm text-muted-foreground"
          >
            Chưa có dữ liệu để hiển thị.
          </p>
        </div></ScrollArea
      >
      <DialogFooter
        class="flex-row flex-wrap items-center justify-between gap-3 border-t p-4"
        ><span v-if="selected.isPending.value" class="text-sm"
          >Đang tải...</span
        >
        <span v-else class="text-sm"
          >Trang {{ page }}/{{ pages }} · {{ count }} kết quả</span
        >
        <div class="flex gap-2">
          <Button
            variant="outline"
            class="cursor-pointer"
            :disabled="page <= 1 || selected.isFetching.value"
            @click="page--"
            >Trước</Button
          ><Button
            variant="outline"
            class="cursor-pointer"
            :disabled="page >= pages || selected.isFetching.value"
            @click="page++"
            >Sau</Button
          >
        </div></DialogFooter
      >
    </DialogContent>
  </Dialog>
</template>
