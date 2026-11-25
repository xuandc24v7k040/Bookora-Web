<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { ArrowLeft, BookOpen, MapPin, ShoppingBag } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supportError } from "../support-errors";
import { useStorefrontBranchesQuery } from "@/features/storefront/api/storefront-api";
import { useStorefrontBranchStore } from "@/stores/storefront-branch.store";
import { listCustomerOrders } from "@/features/orders/api/customer-orders-api";
import { customerOrderStatusLabel } from "@/features/orders/presentation/order-status";
import { useSupportStore } from "../state/support.store";
import SupportThread from "./SupportThread.vue";

const emit = defineEmits<{ back: [] }>();
const store = useSupportStore(),
  storefront = useStorefrontBranchStore();
const kind = ref<"GENERAL" | "ORDER">("GENERAL"),
  branchId = ref(storefront.selectedBranchId ?? ""),
  subject = ref("");
const orderId = ref(""),
  page = ref(1),
  confirmed = ref(false);
const branches = useStorefrontBranchesQuery();
const orders = useQuery({
  queryKey: computed(() => [
    "support-chat",
    store.scope.key,
    "owned-orders",
    page.value,
  ]),
  queryFn: ({ signal }) =>
    listCustomerOrders({ page: page.value, limit: 5 }, signal),
  enabled: computed(() => kind.value === "ORDER" && store.canUse),
  retry: false,
});
const ready = computed(
  () =>
    store.draft?.type === "ORDER" || !!store.draft?.branchId || confirmed.value,
);
async function begin() {
  if (kind.value === "ORDER") {
    if (orderId.value) await store.contactOrder(orderId.value);
  } else if (branchId.value) {
    await store.beginGeneral({
      type: "GENERAL",
      branchId: branchId.value,
      subject: subject.value.trim() || undefined,
    });
    confirmed.value = !store.error;
  }
}
</script>
<template>
  <SupportThread
    v-if="ready || store.messages.length"
    customer
    @back="emit('back')"
  />
  <section
    v-else
    class="flex h-full min-h-0 min-w-0 flex-col bg-background"
    aria-label="Bắt đầu hỗ trợ"
  >
    <header class="flex items-center gap-2 border-b p-3">
      <Button
        variant="ghost"
        size="icon"
        class="size-8 cursor-pointer"
        aria-label="Trở lại danh sách hội thoại"
        @click="emit('back')"
        ><ArrowLeft class="size-4"
      /></Button>
      <h2 class="text-sm font-bold">Bắt đầu trò chuyện</h2>
    </header>
    <ScrollArea class="min-h-0 flex-1"
      ><form class="space-y-5 p-5" @submit.prevent="begin">
        <div class="py-3 text-center">
          <BookOpen class="mx-auto size-10 text-green-800" />
          <h3 class="mt-3 text-base font-bold">
            Bookora có thể giúp gì cho bạn?
          </h3>
          <p class="mt-2 text-xs leading-5 text-muted-foreground">
            Chọn nội dung và chi nhánh để kết nối với đội ngũ hỗ trợ.
          </p>
        </div>
        <div
          class="grid grid-cols-2 gap-2"
          role="group"
          aria-label="Loại yêu cầu hỗ trợ"
        >
          <button
            type="button"
            class="flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring"
            :class="kind === 'GENERAL' ? 'support-selected' : ''"
            :aria-pressed="kind === 'GENERAL'"
            @click="kind = 'GENERAL'"
          >
            <BookOpen class="size-5" />Tư vấn chung</button
          ><button
            type="button"
            class="flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring"
            :class="kind === 'ORDER' ? 'support-selected' : ''"
            :aria-pressed="kind === 'ORDER'"
            @click="kind = 'ORDER'"
          >
            <ShoppingBag class="size-5" />Hỗ trợ đơn hàng
          </button>
        </div>
        <template v-if="kind === 'GENERAL'"
          ><div class="space-y-2">
            <label
              for="support-branch"
              class="flex items-center gap-1.5 text-xs font-semibold"
              ><MapPin class="size-3.5" />Chi nhánh hỗ trợ</label
            ><Select
              v-model="branchId"
              required
              :disabled="branches.isPending.value"
            >
              <SelectTrigger
                id="support-branch"
                class="h-11 w-full cursor-pointer text-sm"
                ><SelectValue placeholder="Chọn chi nhánh"
              /></SelectTrigger>
              <SelectContent
                class="support-customer z-[85] max-w-[calc(100vw-2rem)]"
              >
                <SelectItem
                  v-for="branch in branches.data.value ?? []"
                  :key="branch.id"
                  :value="branch.id"
                >
                  {{ branch.name }}
                </SelectItem>
              </SelectContent></Select
            >
            <div
              v-if="branches.isError.value"
              class="text-xs text-red-700"
              role="alert"
            >
              Không thể tải chi nhánh.
              <button
                type="button"
                class="cursor-pointer underline"
                @click="branches.refetch()"
              >
                Thử lại
              </button>
            </div>
            <p class="text-[11px] leading-5 text-muted-foreground">
              Bạn có thể đổi chi nhánh trước khi bắt đầu. Lựa chọn ở cửa hàng
              chỉ là gợi ý.
            </p>
          </div>
          <div class="space-y-2">
            <label for="support-subject" class="text-xs font-semibold"
              >Chủ đề (không bắt buộc)</label
            ><Input
              id="support-subject"
              v-model="subject"
              :maxlength="160"
              placeholder="Ví dụ: Tư vấn chọn sách"
            /></div
        ></template>
        <div v-else class="space-y-2">
          <label for="support-order" class="text-xs font-semibold"
            >Đơn hàng của bạn</label
          >
          <p
            v-if="orders.isPending.value"
            class="text-xs text-muted-foreground"
          >
            Đang tải đơn hàng...
          </p>
          <div
            v-else-if="orders.isError.value"
            role="alert"
            class="text-xs text-red-700"
          >
            Không thể tải đơn hàng. {{ supportError(orders.error.value) }}
            <button
              type="button"
              class="cursor-pointer underline"
              @click="orders.refetch()"
            >
              Thử lại
            </button>
          </div>
          <template v-else
            ><Select
              v-model="orderId"
              required
              :disabled="!orders.data.value?.items.length"
            >
              <SelectTrigger
                id="support-order"
                class="h-11 w-full cursor-pointer text-sm"
                ><SelectValue placeholder="Chọn đơn hàng"
              /></SelectTrigger>
              <SelectContent
                class="support-customer z-[85] max-w-[calc(100vw-2rem)]"
              >
                <SelectItem
                  v-for="order in orders.data.value?.items ?? []"
                  :key="order.id"
                  :value="order.id"
                >
                  {{ order.orderCode }} ·
                  {{
                    customerOrderStatusLabel(
                      order.status,
                      order.customerReceiptConfirmation.confirmed,
                    )
                  }}
                  · {{ order.branchName }}
                </SelectItem>
              </SelectContent></Select
            >
            <p
              v-if="!orders.data.value?.items.length"
              class="text-xs text-muted-foreground"
            >
              Bạn chưa có đơn hàng. Có thể chọn tư vấn chung.
            </p>
            <div
              v-if="(orders.data.value?.totalPages ?? 0) > 1"
              class="flex items-center justify-between"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="cursor-pointer text-xs"
                :disabled="page <= 1"
                @click="page--"
                >Trước</Button
              ><span class="text-xs"
                >{{ page }} / {{ orders.data.value?.totalPages }}</span
              ><Button
                type="button"
                variant="ghost"
                size="sm"
                class="cursor-pointer text-xs"
                :disabled="page >= (orders.data.value?.totalPages ?? 1)"
                @click="page++"
                >Sau</Button
              >
            </div></template
          >
          <p class="text-[11px] leading-5 text-muted-foreground">
            Yêu cầu được chuyển đến đúng chi nhánh của đơn hàng.
          </p>
        </div>
        <p v-if="store.error" class="text-xs text-red-700" role="alert">
          {{ store.error }}
        </p>
        <Button
          type="submit"
          class="support-primary w-full cursor-pointer"
          :disabled="
            store.contextLoading || (kind === 'GENERAL' ? !branchId : !orderId)
          "
          >{{
            store.contextLoading ? "Đang mở hội thoại..." : "Tiếp tục"
          }}</Button
        >
        <p class="text-center text-[10px] leading-5 text-muted-foreground">
          Chưa tạo yêu cầu cho đến khi bạn gửi tin nhắn đầu tiên.
        </p>
      </form></ScrollArea
    >
  </section>
</template>
