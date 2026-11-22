<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useQuery } from "@tanstack/vue-query";
import {
  adminMembershipDetail,
  adminMembershipHistory,
  adminMembershipTransactions,
} from "@/api/generated/endpoints/admin-membership/admin-membership";
import { useAuthStore } from "@/stores/auth.store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatVnd } from "@/features/products/utils/product-money";
import { membershipDate, tierLabels } from "../membership-ui";
const props = defineProps<{ userId: string | null }>();
const emit = defineEmits<{ close: [] }>();
const auth = useAuthStore(),
  page = ref(1),
  historyPage = ref(1);
watch(
  () => props.userId,
  () => {
    page.value = 1;
    historyPage.value = 1;
  },
);
const enabled = computed(
  () => !!props.userId && auth.user?.isSuperAdmin === true,
);
const base = computed(() => [
  "admin-membership",
  auth.user?.id,
  "detail",
  props.userId,
]);
const detail = useQuery({
  queryKey: base,
  queryFn: async ({ signal }) =>
    (
      await adminMembershipDetail(
        props.userId!,
        { branchScoped: false },
        signal,
      )
    ).data,
  enabled,
});
const transactions = useQuery({
  queryKey: computed(() => [...base.value, "transactions", page.value]),
  queryFn: async ({ signal }) =>
    (
      await adminMembershipTransactions(
        props.userId!,
        { page: page.value, limit: 10 },
        { branchScoped: false },
        signal,
      )
    ).data,
  enabled,
});
const history = useQuery({
  queryKey: computed(() => [...base.value, "history", historyPage.value]),
  queryFn: async ({ signal }) =>
    (
      await adminMembershipHistory(
        props.userId!,
        { page: historyPage.value, limit: 10 },
        { branchScoped: false },
        signal,
      )
    ).data,
  enabled,
});
const error = computed(
  () =>
    detail.isError.value || transactions.isError.value || history.isError.value,
);
const sourceLabels = {
  ORDER: "Đơn hàng",
  BACKFILL: "Đơn lịch sử",
  THRESHOLD_CHANGE: "Thay đổi ngưỡng",
};
function retry() {
  void detail.refetch();
  void transactions.refetch();
  void history.refetch();
}
</script>
<template>
  <Dialog :open="!!userId" @update:open="!$event && emit('close')"
    ><DialogContent
      class="membership-admin flex h-[min(780px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
    >
      <DialogHeader class="border-b p-5 pr-12 text-left"
        ><DialogTitle>Chi tiết thành viên</DialogTitle
        ><DialogDescription
          >Thông tin và lịch sử chỉ đọc.</DialogDescription
        ></DialogHeader
      >
      <ScrollArea class="min-h-0 flex-1 overflow-hidden"
        ><div class="space-y-5 p-5">
          <Skeleton v-if="detail.isPending.value" class="h-24 w-full" />
          <template v-else-if="detail.data.value"
            ><div class="min-w-0 rounded-xl border p-4">
              <p
                class="truncate font-semibold"
                :title="detail.data.value.fullName ?? ''"
              >
                {{ detail.data.value.fullName ?? "Chưa cập nhật tên" }}
              </p>
              <p class="break-all text-sm text-muted-foreground">
                {{ detail.data.value.email }}
              </p>
              <p class="mt-3">
                Hạng
                <strong>{{ tierLabels[detail.data.value.currentTier] }}</strong>
                · {{ formatVnd(detail.data.value.lifetimeSpend) }}
              </p>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ membershipDate(detail.data.value.achievedAt) }}
              </p>
            </div></template
          >
          <div v-if="error" role="alert">
            <p>Không thể tải đầy đủ dữ liệu.</p>
            <Button class="mt-2 cursor-pointer" variant="outline" @click="retry"
              >Thử lại</Button
            >
          </div>
          <section>
            <h3 class="mb-2 font-semibold">Lịch sử nâng hạng</h3>
            <p v-if="history.isPending.value" class="text-sm">Đang tải...</p>
            <div
              v-for="row in history.data.value?.items ?? []"
              :key="row.id"
              class="border-b py-2 text-sm"
            >
              <p>
                {{ tierLabels[row.fromTier] }} →
                <strong>{{ tierLabels[row.toTier] }}</strong>
              </p>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ sourceLabels[row.source] }} ·
                {{ membershipDate(row.effectiveAt) }}
              </p>
            </div>
            <p
              v-if="history.data.value?.totalItems === 0"
              class="text-sm text-muted-foreground"
            >
              Chưa có lần nâng hạng.
            </p>
            <div
              v-if="(history.data.value?.totalPages ?? 1) > 1"
              class="mt-3 flex items-center justify-between gap-2 text-xs"
            >
              <span
                >Trang {{ historyPage }}/{{
                  history.data.value?.totalPages
                }}</span
              >
              <div class="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  :disabled="historyPage <= 1"
                  @click="historyPage--"
                  >Trước</Button
                ><Button
                  size="sm"
                  variant="outline"
                  :disabled="
                    historyPage >= (history.data.value?.totalPages ?? 1)
                  "
                  @click="historyPage++"
                  >Sau</Button
                >
              </div>
            </div>
          </section>
          <section>
            <h3 class="mb-2 font-semibold">Đơn tích lũy</h3>
            <p v-if="transactions.isPending.value" class="text-sm">
              Đang tải...
            </p>
            <div
              v-for="row in transactions.data.value?.items ?? []"
              :key="row.id"
              class="flex min-w-0 flex-wrap justify-between gap-2 border-b py-3 text-sm"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium" :title="row.orderCode">
                  #{{ row.orderCode }}
                </p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ membershipDate(row.effectiveAt) }}
                </p>
              </div>
              <strong class="max-w-full break-words tabular-nums text-primary"
                >+{{ formatVnd(row.amount) }}</strong
              >
            </div>
            <p
              v-if="transactions.data.value?.totalItems === 0"
              class="text-sm text-muted-foreground"
            >
              Chưa có đơn tích lũy.
            </p>
          </section>
        </div></ScrollArea
      >
      <DialogFooter
        class="flex-row flex-wrap items-center justify-between gap-3 border-t p-4"
        ><span v-if="transactions.isPending.value" class="text-sm"
          >Đang tải đơn tích lũy...</span
        >
        <span v-else class="text-sm"
          >Đơn tích lũy: trang {{ page }}/{{
            transactions.data.value?.totalPages ?? 1
          }}</span
        >
        <div class="flex gap-2">
          <Button
            variant="outline"
            :disabled="page <= 1 || transactions.isFetching.value"
            @click="page--"
            >Trước</Button
          ><Button
            variant="outline"
            :disabled="
              page >= (transactions.data.value?.totalPages ?? 1) ||
              transactions.isFetching.value
            "
            @click="page++"
            >Sau</Button
          >
        </div></DialogFooter
      >
    </DialogContent></Dialog
  >
</template>
