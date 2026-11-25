<script setup lang="ts">
import SupportAvatar from "./SupportAvatar.vue";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useInfiniteQuery } from "@tanstack/vue-query";
import { BookOpen, MessageSquarePlus, RefreshCw, Search } from "@lucide/vue";
import type {
  SupportTicketDto,
  SupportTicketsListParams,
} from "@/api/generated/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/date-format";
import { listTickets, supportKeys } from "../api/support-api";
import { useSupportStore } from "../state/support.store";
import SupportStatus from "./SupportStatus.vue";

const props = defineProps<{ customer?: boolean }>();
const emit = defineEmits<{ select: []; start: [] }>();
const store = useSupportStore();
const search = ref(""),
  needle = ref("");
const filter = ref<SupportTicketDto["status"] | "">("");
let debounce: ReturnType<typeof setTimeout> | undefined;
watch(search, (value) => {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => {
    needle.value = value.trim().slice(0, 160);
  }, 250);
});
onBeforeUnmount(() => {
  if (debounce) clearTimeout(debounce);
});
const filters = computed(() =>
  props.customer
    ? [
        { value: "", label: "Tất cả" },
        { value: "IN_PROGRESS", label: "Đang hỗ trợ" },
        { value: "RESOLVED", label: "Đã giải quyết" },
      ]
    : [
        { value: "", label: "Tất cả" },
        { value: "OPEN", label: "Chờ tiếp nhận" },
        { value: "IN_PROGRESS", label: "Đang xử lý" },
        { value: "RESOLVED", label: "Đã giải quyết" },
      ],
);
const params = computed<SupportTicketsListParams>(() => ({
  ...(filter.value ? { status: filter.value } : {}),
  ...(needle.value ? { query: needle.value } : {}),
  limit: 30,
}));
const query = useInfiniteQuery({
  queryKey: computed(() => supportKeys.list(store.scope, params.value)),
  initialPageParam: undefined as string | undefined,
  queryFn: async ({ pageParam, signal }) => {
    const captured = store.scope;
    const result = await listTickets(
      captured,
      { ...params.value, cursor: pageParam },
      signal,
    );
    if (captured.key === store.scope.key)
      for (const ticket of result.items) store.publishTicket(ticket);
    return result;
  },
  getNextPageParam: (page) => page.nextCursor ?? undefined,
  enabled: computed(() => store.canUse),
  staleTime: 30_000,
  retry: false,
});
const items = computed(() => {
  const byId = new Map(
    (query.data.value?.pages.flatMap((p) => p.items) ?? []).map((t) => [
      t.id,
      store.tickets[t.id] ?? t,
    ]),
  );
  return [...byId.values()]
    .filter((t) => !filter.value || filter.value === t.status)
    .sort(
      (a, b) =>
        b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id),
    );
});
async function select(id: string) {
  emit("select");
  await store.selectTicket(id);
}
</script>
<template>
  <section
    class="support-ticket-list flex h-full min-h-0 min-w-0 flex-col bg-background"
    aria-label="Danh sách hội thoại hỗ trợ"
  >
    <div class="space-y-3 border-b p-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-bold">
          {{ customer ? "Hội thoại của bạn" : "Hội thoại hỗ trợ" }}
          <span
            v-if="store.unread"
            class="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs"
            >{{ store.unread }} chưa đọc</span
          >
        </h2>
        <Button
          size="icon"
          variant="ghost"
          class="size-8 cursor-pointer"
          aria-label="Làm mới hội thoại"
          :disabled="query.isFetching.value"
          @click="query.refetch()"
          ><RefreshCw
            class="size-4"
            :class="{ 'animate-spin': query.isFetching.value }"
        /></Button>
      </div>
      <Button
        v-if="customer"
        class="support-primary w-full cursor-pointer"
        @click="emit('start')"
        ><MessageSquarePlus class="size-4" />Bắt đầu trò chuyện</Button
      >
      <div class="relative">
        <Search
          class="absolute left-3 top-2.5 size-4 text-muted-foreground"
        /><Input
          v-model="search"
          class="pl-9 text-xs"
          :maxlength="160"
          :placeholder="
            customer
              ? 'Tìm mã đơn, nội dung...'
              : 'Tìm khách hàng, mã đơn, chủ đề...'
          "
          aria-label="Tìm hội thoại"
        />
      </div>
      <div
        class="flex flex-wrap gap-1.5"
        role="group"
        aria-label="Trạng thái hội thoại"
      >
        <Button
          v-for="item in filters"
          :key="item.value"
          size="sm"
          :variant="filter === item.value ? 'default' : 'outline'"
          class="h-7 cursor-pointer rounded-full px-2.5 text-[11px]"
          :class="filter === item.value ? 'support-primary' : ''"
          :aria-pressed="filter === item.value"
          @click="filter = item.value as typeof filter"
          >{{ item.label }}</Button
        >
      </div>
    </div>
    <ScrollArea class="min-h-0 flex-1">
      <div class="space-y-1.5 p-2.5">
        <template v-if="query.isPending.value"
          ><Skeleton v-for="n in 4" :key="n" class="h-24 rounded-xl"
        /></template>
        <div
          v-else-if="query.isError.value"
          role="alert"
          class="p-4 text-center text-sm"
        >
          <p>Không thể tải hội thoại.</p>
          <Button
            variant="outline"
            class="mt-3 cursor-pointer"
            @click="query.refetch()"
            >Thử lại</Button
          >
        </div>
        <div
          v-else-if="!items.length"
          class="px-3 py-12 text-center text-sm text-muted-foreground"
        >
          <BookOpen class="mx-auto mb-3 size-9 opacity-40" />
          <p>
            {{
              needle
                ? "Không tìm thấy hội thoại phù hợp."
                : "Chưa có hội thoại hỗ trợ."
            }}
          </p>
          <p v-if="customer && !needle" class="mt-2 text-xs leading-5">
            Chọn “Bắt đầu trò chuyện” khi bạn cần Bookora hỗ trợ.
          </p>
        </div>
        <button
          v-for="ticket in items"
          :key="ticket.id"
          type="button"
          class="support-ticket w-full cursor-pointer rounded-xl border border-transparent p-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :class="
            store.activeId === ticket.id ? 'support-selected' : 'bg-background'
          "
          :aria-current="store.activeId === ticket.id ? 'true' : undefined"
          @click="select(ticket.id)"
        >
          <div class="flex gap-2.5">
            <span
              class="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold"
              ><SupportAvatar
                v-if="!customer"
                :name="ticket.customerName"
                :url="ticket.customerAvatarUrl" /><BookOpen
                v-if="customer"
                class="size-5 text-green-800"
            /></span>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <strong class="truncate text-xs">{{
                  customer ? ticket.branchName : ticket.customerName
                }}</strong
                ><span
                  v-if="ticket.unreadCount"
                  class="flex size-4 shrink-0 items-center justify-center rounded-full bg-green-700 text-[9px] text-white"
                  >{{
                    ticket.unreadCount > 9 ? "9+" : ticket.unreadCount
                  }}</span
                >
              </div>
              <p class="mt-1 truncate text-[11px] text-muted-foreground">
                {{
                  ticket.type === "ORDER"
                    ? (ticket.orderCode ?? "Hỗ trợ đơn hàng")
                    : "Tư vấn chung"
                }}<template v-if="ticket.subject">
                  · {{ ticket.subject }}</template
                >
              </p>
              <p class="mt-1.5 truncate text-xs text-muted-foreground">
                {{
                  ticket.lastMessage?.text ||
                  (ticket.lastMessage?.attachments.length
                    ? "Tệp đính kèm"
                    : "Hội thoại hỗ trợ")
                }}
              </p>
              <div
                class="mt-2 flex flex-wrap items-center justify-between gap-1"
              >
                <SupportStatus
                  :status="ticket.status"
                  :customer="customer"
                /><span class="text-[10px] text-muted-foreground">{{
                  formatRelativeTime(ticket.updatedAt)
                }}</span>
              </div>
              <p
                v-if="!customer && ticket.assigneeName"
                class="mt-1.5 truncate text-[10px] text-muted-foreground"
              >
                Phụ trách: {{ ticket.assigneeName }}
              </p>
            </div>
          </div>
        </button>
        <Button
          v-if="query.hasNextPage.value"
          variant="outline"
          class="mt-2 w-full cursor-pointer"
          :disabled="query.isFetchingNextPage.value"
          @click="query.fetchNextPage()"
          >{{
            query.isFetchingNextPage.value
              ? "Đang tải..."
              : "Xem thêm hội thoại"
          }}</Button
        >
      </div>
    </ScrollArea>
  </section>
</template>
