<script setup lang="ts">
import type { CustomerOrderResponseDtoStatus } from "@/api/generated/models";
import { computed } from "vue";
import { useInfiniteQuery, useQuery } from "@tanstack/vue-query";
import {
  BookOpen,
  ClipboardList,
  ExternalLink,
  Headphones,
  MapPin,
  Package,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAdminOrder } from "@/features/admin-orders/api/admin-orders-api";
import {
  customerOrderStatusLabel,
  paymentStatusLabel,
} from "@/features/orders/presentation/order-status";
import { formatDateTime } from "@/lib/date-format";
import { useSupportStore } from "../state/support.store";
import { listActivities } from "../api/support-api";
import { useSupportOrderContext } from "../api/support-queries";
import SupportAvatar from "./SupportAvatar.vue";

const store = useSupportStore();
const context = useSupportOrderContext();
const canOrder = computed(
  () =>
    store.canUse &&
    store.can("orders.read") &&
    context.data.value?.canViewOrderDetail === true &&
    context.data.value.branchId === store.scope.branchId &&
    !!store.active?.orderId,
);
const order = useQuery({
  queryKey: computed(() => [
    "support-chat",
    store.scope.key,
    "authorized-order",
    store.active?.orderId,
  ]),
  queryFn: ({ signal }) => getAdminOrder(store.active!.orderId!, signal),
  enabled: canOrder,
  retry: false,
  staleTime: 30_000,
});
const activities = useInfiniteQuery({
  queryKey: computed(() => [
    "support-chat",
    store.scope.key,
    "activities",
    store.activeId,
    store.active?.status,
    store.active?.assigneeId,
  ]),
  initialPageParam: undefined as string | undefined,
  queryFn: ({ pageParam, signal }) =>
    listActivities(store.scope, store.activeId!, pageParam, signal),
  getNextPageParam: (page) => page.nextCursor ?? undefined,
  enabled: computed(() => !!store.activeId && store.canUse),
  retry: false,
});
const actionLabels: Record<string, string> = {
  CREATE: "Khách tạo yêu cầu",
  CLAIM: "Tiếp nhận xử lý",
  UNCLAIM: "Bỏ nhận xử lý",
  REASSIGN: "Phân công người phụ trách",
  RESOLVE: "Đánh dấu đã giải quyết",
  REOPEN: "Khách tiếp tục hỗ trợ",
};
const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});
</script>
<template>
  <ScrollArea v-if="store.active" class="h-full min-h-0 bg-background">
    <div class="space-y-3 p-3">
      <h2 class="text-xs font-bold uppercase tracking-wide">
        Thông tin hỗ trợ
      </h2>
      <section class="rounded-xl border bg-muted/15 p-3">
        <div class="flex items-center gap-2">
          <SupportAvatar
            :name="store.active.customerName"
            :url="store.active.customerAvatarUrl"
          />
          <div class="min-w-0">
            <h3 class="break-words text-sm font-bold">
              {{ store.active.customerName }}
            </h3>
            <p class="mt-1 text-[11px] text-muted-foreground">Khách hàng</p>
          </div>
        </div>
        <p class="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin class="size-3.5 shrink-0" />{{ store.active.branchName }}
        </p>
      </section>
      <section
        v-if="store.active.type === 'ORDER'"
        class="space-y-2 rounded-xl border p-3"
      >
        <h3 class="flex items-center gap-1.5 break-all text-xs font-bold">
          <ClipboardList class="size-4 shrink-0" />{{
            context.data.value?.orderCode ?? "Hỗ trợ đơn hàng"
          }}
        </h3>
        <p v-if="context.isError.value" class="text-xs text-muted-foreground">
          Chưa tải được tóm tắt đơn hàng.
          <button class="cursor-pointer underline" @click="context.refetch()">
            Thử lại
          </button>
        </p>
        <p v-else-if="context.data.value" class="text-xs text-muted-foreground">
          Trạng thái:
          {{
            customerOrderStatusLabel(
              context.data.value.status as CustomerOrderResponseDtoStatus,
              order.data.value?.customerReceiptConfirmation.confirmed ?? false,
            )
          }}
        </p>
        <template v-if="canOrder && order.data.value"
          ><dl class="space-y-2 text-xs">
            <div class="flex justify-between gap-2">
              <dt class="text-muted-foreground">Thanh toán</dt>
              <dd>{{ order.data.value.payment?.method ?? "—" }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-muted-foreground">Trạng thái</dt>
              <dd>
                {{
                  order.data.value.payment
                    ? paymentStatusLabel(order.data.value.payment.status)
                    : "—"
                }}
              </dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-muted-foreground">Tổng tiền</dt>
              <dd class="font-bold">
                {{ money.format(order.data.value.totalAmount) }}
              </dd>
            </div>
          </dl></template
        >
        <p
          v-else-if="!canOrder"
          class="rounded-lg bg-muted/60 p-2 text-[11px] leading-5 text-muted-foreground"
        >
          Phạm vi hỗ trợ chỉ hiển thị tóm tắt đơn hàng. Cần quyền xem đơn hàng
          để truy cập sản phẩm, thanh toán và giao nhận.
        </p>
        <p
          v-if="canOrder && order.isError.value"
          class="text-xs text-muted-foreground"
        >
          Không thể tải chi tiết đơn hàng.
          <button class="cursor-pointer underline" @click="order.refetch()">
            Thử lại
          </button>
        </p>
        <Button
          v-if="canOrder"
          as-child
          variant="outline"
          size="sm"
          class="w-full cursor-pointer text-xs"
          ><RouterLink
            :to="{
              name: 'branch-admin-order-detail',
              params: { id: store.active.orderId },
            }"
            ><ExternalLink class="size-3.5" />Xem chi tiết đơn hàng</RouterLink
          ></Button
        >
      </section>
      <section v-else class="space-y-2 rounded-xl border p-3">
        <h3 class="flex items-center gap-1.5 text-xs font-bold">
          <BookOpen class="size-4" />Tư vấn chung
        </h3>
        <p class="break-words text-xs text-muted-foreground">
          {{ store.active.subject || "Không có chủ đề riêng" }}
        </p>
      </section>
      <template v-if="canOrder && order.data.value"
        ><section class="rounded-xl border p-3">
          <h3 class="mb-3 flex items-center gap-1.5 text-xs font-bold">
            <Package class="size-4" />Sản phẩm đã mua ({{
              order.data.value.items.length
            }})
          </h3>
          <div
            v-for="item in order.data.value.items"
            :key="item.id"
            class="flex min-w-0 items-start gap-2 border-t py-2 first:border-0"
          >
            <img
              v-if="item.imageUrl"
              :src="item.imageUrl"
              :alt="item.productName"
              class="h-12 w-8 shrink-0 rounded object-cover"
            />
            <div class="min-w-0 flex-1">
              <p class="line-clamp-2 text-[11px] font-semibold">
                {{ item.productName }}
              </p>
              <p class="mt-1 text-[10px] text-muted-foreground">
                {{ item.variantLabel }} · SL: {{ item.quantity }}
              </p>
              <p class="mt-1 text-[11px] font-semibold">
                {{ money.format(item.lineTotal) }}
              </p>
            </div>
          </div>
        </section>
        <section class="space-y-2 rounded-xl border p-3">
          <h3 class="flex items-center gap-1.5 text-xs font-bold">
            <MapPin class="size-4" />Thông tin giao hàng
          </h3>
          <p class="text-xs">{{ order.data.value.receiverName }}</p>
          <p class="text-xs">{{ order.data.value.receiverPhone }}</p>
          <p class="break-words text-xs leading-5 text-muted-foreground">
            {{ order.data.value.shippingAddress }}
          </p>
        </section></template
      >
      <section class="space-y-3 rounded-xl border p-3">
        <h3 class="flex items-center gap-1.5 text-xs font-bold">
          <Headphones class="size-4" />Thông tin xử lý
        </h3>
        <dl class="space-y-2.5 text-[11px]">
          <div class="flex justify-between gap-2">
            <dt class="text-muted-foreground">Phụ trách</dt>
            <dd class="text-right font-medium">
              {{ store.active.assigneeName ?? "Chưa phân công" }}
            </dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt class="text-muted-foreground">Ngày tạo</dt>
            <dd>{{ formatDateTime(store.active.createdAt) }}</dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt class="text-muted-foreground">Cập nhật</dt>
            <dd>{{ formatDateTime(store.active.updatedAt) }}</dd>
          </div>
        </dl>
      </section>
      <section class="rounded-xl border p-3">
        <h3 class="mb-3 text-xs font-bold">Lịch sử xử lý</h3>
        <p
          v-if="activities.isPending.value"
          class="text-xs text-muted-foreground"
        >
          Đang tải...
        </p>
        <p
          v-if="activities.isError.value"
          class="text-xs text-muted-foreground"
        >
          Không thể tải lịch sử.
          <button
            class="cursor-pointer underline"
            @click="activities.refetch()"
          >
            Thử lại
          </button>
        </p>
        <ol class="space-y-3 border-l pl-3">
          <li
            v-for="item in activities.data.value?.pages.flatMap(
              (p) => p.items,
            ) ?? []"
            :key="item.id"
            class="text-[11px]"
          >
            <p class="font-medium">
              {{ actionLabels[item.action] ?? item.action }}
            </p>
            <time
              :datetime="item.createdAt"
              class="mt-1 block text-[10px] text-muted-foreground"
              >{{ formatDateTime(item.createdAt) }}</time
            >
          </li>
        </ol>
        <Button
          v-if="activities.hasNextPage.value"
          size="sm"
          variant="ghost"
          class="mt-2 w-full cursor-pointer text-xs"
          :disabled="activities.isFetchingNextPage.value"
          @click="activities.fetchNextPage()"
          >Xem thêm lịch sử</Button
        >
      </section>
    </div>
  </ScrollArea>
</template>
