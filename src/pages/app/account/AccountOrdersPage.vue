<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  PackageOpen,
  RefreshCcw,
  ShoppingBag,
} from "@lucide/vue";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import { computed, ref, watch } from "vue";
import { TabsIndicator } from "reka-ui";
import "@/components/client/common/client-tabs.css";
import { useRoute, useRouter } from "vue-router";
import type {
  CustomerOrderResponseDtoStatus,
  CustomerOrdersListParams,
  CustomerOrdersListTab,
} from "@/api/generated/models";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  customerOrderKeys,
  listCustomerOrders,
} from "@/features/orders/api/customer-orders-api";
import { ORDER_LIST_QUERY_POLICY } from "@/features/orders/api/order-query-policy";
import CustomerReceiptConfirmationAction from "@/features/orders/components/CustomerReceiptConfirmationAction.vue";
import SupportOrderContact from '@/features/support/components/SupportOrderContact.vue';
import {
  customerOrderStatusLabel,
  paymentStatusLabel,
} from "@/features/orders/presentation/order-status";

interface CustomerOrderTab {
  key: string;
  label: string;
  statuses: readonly CustomerOrderResponseDtoStatus[] | null;
  semanticTab?: CustomerOrdersListTab;
}

const ORDER_TABS = [
  { key: "all", label: "Tất cả", statuses: null },
  {
    key: "pending-payment",
    label: "Chờ thanh toán",
    statuses: ["PENDING_PAYMENT"],
  },
  {
    key: "payment-failed",
    label: "Thanh toán thất bại",
    statuses: ["PAYMENT_FAILED"],
  },
  { key: "pending", label: "Chờ xác nhận", statuses: ["PENDING"] },
  {
    key: "processing",
    label: "Đang xử lý",
    statuses: ["CONFIRMED", "PACKING"],
  },
  {
    key: "shipping",
    label: "Đang vận chuyển",
    statuses: null,
    semanticTab: "shipping",
  },
  {
    key: "received",
    label: "Đã nhận hàng",
    statuses: null,
    semanticTab: "received",
  },
  { key: "cancelled", label: "Đã hủy", statuses: ["CANCELLED"] },
  { key: "returned", label: "Đã hoàn trả", statuses: ["RETURNED"] },
] as const satisfies readonly CustomerOrderTab[];

const ACCOUNT_ORDERS_PAGE_SIZE = 3;
const route = useRoute();
const router = useRouter();
const money = new Intl.NumberFormat("vi-VN");
const date = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" });

function firstQueryValue(value: unknown): string {
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

function positivePage(value: unknown): number {
  const parsed = Number(firstQueryValue(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

const activeTab = computed<CustomerOrderTab>(() => {
  const routeKey = firstQueryValue(route.query.tab);
  const key = routeKey === "completed" ? "received" : routeKey;
  return ORDER_TABS.find((tab) => tab.key === key) ?? ORDER_TABS[0];
});
const currentPage = computed(() => positivePage(route.query.page));
const tabDirection = ref("client-tab-forward");
watch(
  () => activeTab.value.key,
  (next, previous) => {
    tabDirection.value =
      ORDER_TABS.findIndex((tab) => tab.key === next) >
      ORDER_TABS.findIndex((tab) => tab.key === previous)
        ? "client-tab-forward"
        : "client-tab-back";
  },
);
const listParams = computed<CustomerOrdersListParams>(() => ({
  ...(activeTab.value.semanticTab ? { tab: activeTab.value.semanticTab } : {}),
  ...(activeTab.value.statuses
    ? { status: [...activeTab.value.statuses] }
    : {}),
  page: currentPage.value,
  limit: ACCOUNT_ORDERS_PAGE_SIZE,
}));
const ordersQuery = useQuery({
  ...ORDER_LIST_QUERY_POLICY,
  queryKey: computed(() => customerOrderKeys.list(listParams.value)),
  queryFn: ({ signal }) => listCustomerOrders(listParams.value, signal),
  placeholderData: keepPreviousData,
});
const emptyMessage = computed(() =>
  activeTab.value.key === "all"
    ? "Bạn chưa có đơn hàng nào."
    : `Bạn chưa có đơn hàng ${activeTab.value.label.toLocaleLowerCase("vi-VN")}.`,
);

watch(
  () => [route.query.tab, route.query.page] as const,
  ([rawTab, rawPage]) => {
    const normalizedTab = activeTab.value.key;
    const normalizedPage = positivePage(rawPage);
    if (
      firstQueryValue(rawTab) === normalizedTab &&
      firstQueryValue(rawPage) === String(normalizedPage)
    ) {
      return;
    }
    void router.replace({
      query: {
        ...route.query,
        tab: normalizedTab,
        page: String(normalizedPage),
      },
    });
  },
  { immediate: true },
);

watch(
  () => ordersQuery.data.value?.totalPages,
  (totalPages) => {
    if (!totalPages || currentPage.value <= totalPages) return;
    void changePage(totalPages, true);
  },
);

function changeTab(tab: CustomerOrderTab): void {
  if (tab.key === activeTab.value.key && currentPage.value === 1) return;
  void router.push({
    query: { ...route.query, tab: tab.key, page: "1" },
  });
}

async function changePage(page: number, replace = false): Promise<void> {
  const navigation = {
    query: { ...route.query, tab: activeTab.value.key, page: String(page) },
  };
  if (replace) {
    await router.replace(navigation);
    return;
  }
  await router.push(navigation);
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold">Đơn hàng của tôi</h1>
    <p class="mt-1 text-sm text-slate-500">
      Theo dõi trạng thái thanh toán và giao hàng.
    </p>

    <Tabs
      :model-value="activeTab.key"
      @update:model-value="(value) => changeTab(ORDER_TABS.find((tab) => tab.key === value) ?? ORDER_TABS[0])"
    >
      <ScrollArea
        type="auto"
        scrollbar-orientation="horizontal"
        class="mt-6 w-full min-w-0 border-b pb-3"
      >
        <TabsList
          class="relative flex h-auto w-max min-w-max max-w-none gap-6 rounded-none bg-transparent p-0 pr-4"
          aria-label="Lọc đơn hàng theo trạng thái"
        >
          <TabsIndicator aria-hidden="true" class="client-tabs-indicator absolute bottom-0 left-0 h-0.5 bg-[var(--bookora-green)] transition-[transform,width] duration-200 motion-reduce:transition-none" />
          <TabsTrigger
            v-for="tab in ORDER_TABS"
            :key="tab.key"
            :value="tab.key"
            class="flex-none rounded-none border-b-2 border-transparent bg-transparent px-1 py-0 pb-3 text-sm font-semibold whitespace-nowrap shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bookora-green)] data-[state=active]:shadow-none"
            :class="
              tab.key === activeTab.key
                ? 'text-[var(--bookora-green)]'
                : 'text-slate-500 hover:text-[var(--bookora-green)]'
            "
          >
            {{ tab.label }}
          </TabsTrigger>
        </TabsList>
      </ScrollArea>

      <div class="min-w-0 overflow-hidden">
        <Transition :name="tabDirection" mode="out-in">
          <TabsContent :key="activeTab.key" :value="activeTab.key" force-mount class="mt-0 min-w-0">
            <div
              v-if="ordersQuery.isLoading.value && !ordersQuery.data.value"
              class="mt-6 space-y-3"
            >
              <Skeleton
                v-for="index in ACCOUNT_ORDERS_PAGE_SIZE"
                :key="index"
                class="h-36 rounded-xl"
              />
            </div>

            <div
              v-else-if="ordersQuery.isError.value"
              class="mt-6 rounded-xl border border-dashed p-10 text-center"
            >
              <PackageOpen class="mx-auto size-12 text-slate-300" />
              <p class="mt-3 font-medium">Không thể tải danh sách đơn hàng.</p>
              <Button
                type="button"
                variant="outline"
                class="mt-4"
                @click="ordersQuery.refetch()"
              >
                <RefreshCcw class="size-4" /> Thử lại
              </Button>
            </div>

            <div
              v-else-if="!ordersQuery.data.value?.items.length"
              class="mt-6 rounded-xl border border-dashed p-10 text-center"
            >
              <PackageOpen class="mx-auto size-12 text-slate-300" />
              <p class="mt-3 font-medium">{{ emptyMessage }}</p>
              <Button as-child class="mt-4">
                <RouterLink to="/san-pham">Mua sắm ngay</RouterLink>
              </Button>
            </div>

            <template v-else>
              <ul class="mt-6 space-y-3" :aria-busy="ordersQuery.isFetching.value">
                <li
                  v-for="order in ordersQuery.data.value.items"
                  :key="order.id"
                  class="rounded-xl border bg-white p-5"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0 max-w-full">
                      <p class="flex min-w-0 items-start gap-2 font-bold">
                        <ShoppingBag class="mt-1 size-4 shrink-0 text-green-700" />
                        <span class="min-w-0 [overflow-wrap:anywhere]">{{ order.orderCode }}</span>
                      </p>
                      <p class="mt-1 text-sm text-slate-500">
                        Ngày đặt hàng: {{ date.format(new Date(order.placedAt)) }}
                      </p>
                    </div>
                    <Badge variant="secondary">{{
                      customerOrderStatusLabel(
                        order.status,
                        order.customerReceiptConfirmation.confirmed,
                      )
                    }}</Badge>
                  </div>

                  <div v-if="order.items[0]" class="mt-4 flex gap-3 border-t pt-4">
                    <img
                      v-if="order.items[0].imageUrl"
                      :src="order.items[0].imageUrl"
                      :alt="order.items[0].productName"
                      class="h-16 w-12 rounded border object-cover"
                    />
                    <div class="min-w-0 flex-1">
                      <p class="truncate font-semibold">
                        {{ order.items[0].productName }}
                      </p>
                      <p class="mt-1 text-sm text-slate-500">
                        {{ order.items[0].variantLabel }} · Số lượng
                        {{ order.items[0].quantity }}
                      </p>
                      <p
                        v-if="order.items.length > 1"
                        class="mt-1 text-xs text-slate-400"
                      >
                        Và {{ order.items.length - 1 }} sản phẩm khác
                      </p>
                    </div>
                  </div>

                  <div
                    class="mt-4 flex min-w-0 flex-wrap items-end justify-between gap-4 border-t pt-4 sm:flex-nowrap"
                  >
                    <div class="min-w-0 text-sm text-slate-500">
                      {{ order.paymentMethod }} ·
                      {{ paymentStatusLabel(order.paymentStatus) }}
                    </div>
                    <div class="w-full min-w-0 text-left sm:w-auto sm:text-right">
                      <strong class="break-words text-lg text-red-600">
                        {{ money.format(order.totalAmount) }}đ
                      </strong>
                      <div
                        class="mt-2 flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end"
                      >
                        <CustomerReceiptConfirmationAction
                          v-if="order.allowedActions.confirmReceived"
                          :order-id="order.id"
                          compact
                        />
                        <SupportOrderContact :order-id="order.id" class="w-full shrink-0 sm:w-auto" />
                        <Button
                          v-if="
                            order.status === 'COMPLETED' &&
                            order.reviewAction.type === 'WRITE'
                          "
                          as-child
                          size="sm"
                          class="w-full shrink-0 bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)] sm:w-auto"
                        >
                          <RouterLink
                            :to="{
                              path: '/account/reviews',
                              query: {
                                tab: 'pending',
                                orderId: order.id,
                              },
                            }"
                          >
                            Đánh giá ({{ order.reviewAction.count }})
                          </RouterLink>
                        </Button>
                        <Button
                          v-else-if="
                            order.status === 'COMPLETED' &&
                            order.reviewAction.type === 'VIEW'
                          "
                          as-child
                          size="sm"
                          class="w-full shrink-0 bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)] sm:w-auto"
                        >
                          <RouterLink
                            :to="{
                              path: '/account/reviews',
                              query: {
                                tab: 'written',
                                orderId: order.id,
                              },
                            }"
                          >
                            Xem đánh giá
                          </RouterLink>
                        </Button>
                        <Button
                          as-child
                          variant="outline"
                          size="sm"
                          class="w-full shrink-0 sm:w-auto"
                        >
                          <RouterLink
                            :to="{
                              name: 'customer-account-order-detail',
                              params: { orderId: order.id },
                            }"
                          >
                            Xem chi tiết
                          </RouterLink>
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>

              <nav
                v-if="ordersQuery.data.value.totalPages > 1"
                class="mt-6 flex items-center justify-center gap-2"
                aria-label="Phân trang đơn hàng"
              >
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label="Trang trước"
                  :disabled="currentPage <= 1 || ordersQuery.isFetching.value"
                  @click="changePage(currentPage - 1)"
                >
                  <ChevronLeft class="size-4" />
                </Button>
                <span class="px-3 text-sm text-slate-600">
                  Trang {{ currentPage }} / {{ ordersQuery.data.value.totalPages }}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label="Trang sau"
                  :disabled="
                    currentPage >= ordersQuery.data.value.totalPages ||
                    ordersQuery.isFetching.value
                  "
                  @click="changePage(currentPage + 1)"
                >
                  <ChevronRight class="size-4" />
                </Button>
              </nav>
            </template>
          </TabsContent>
        </Transition>
      </div>
    </Tabs>
  </div>
</template>
