<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  BookOpen,
  Maximize2,
  MessageCircle,
  Minimize2,
  Minus,
  WifiOff,
  X,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/auth.store";
import { useSupportStore } from "../state/support.store";
import SupportTicketList from "./SupportTicketList.vue";
import SupportThread from "./SupportThread.vue";
import SupportPrechat from "./SupportPrechat.vue";

const store = useSupportStore(),
  auth = useAuthStore(),
  route = useRoute(),
  router = useRouter();
const launcher = ref<InstanceType<typeof Button>>();
const showThread = ref(false),
  prechat = ref(false);
const eligible = computed(
  () =>
    !route.path.startsWith("/super-admin") &&
    !route.path.startsWith("/branch-admin") &&
    !route.meta.guestOnly &&
    ![
      "/admin",
      "/login",
      "/register",
      "/auth",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
    ].some((p) => route.path.startsWith(p)) &&
    (auth.user?.type === "CUSTOMER" || !auth.user),
);
const visible = computed(
  () => eligible.value && store.open && auth.user?.type === "CUSTOMER",
);
async function launch() {
  await auth.ensureBootstrapped();
  if (!auth.isAuthenticated) {
    await router.push({
      name: "customer-login",
      query: {
        redirect: router.resolve({
          path: route.path,
          query: { ...route.query, support: "open" },
        }).fullPath,
      },
    });
    return;
  }
  store.open = !store.open;
}
function back() {
  showThread.value = false;
  prechat.value = false;
  store.stopTyping();
}
function start() {
  store.startDraft();
  prechat.value = true;
  showThread.value = true;
}
watch(
  () => store.activeId,
  (id) => {
    if (id) {
      showThread.value = true;
      prechat.value = false;
    }
  },
);
watch(
  () => store.draft,
  (draft) => {
    if (draft) {
      prechat.value = true;
      showThread.value = true;
    }
  },
);
watch(
  () => store.open,
  (open) => {
    if (!open) store.stopTyping();
  },
);
watch(
  () => [route.query.support, auth.isAuthenticated],
  async () => {
    if (!auth.isAuthenticated || !store.isCustomer) return;
    const order = route.query.supportOrder;
    if (route.query.support === "open") store.open = true;
    if (
      typeof order === "string" &&
      /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(order)
    )
      await store.contactOrder(order);
    if (route.query.support || route.query.supportOrder) {
      const query = { ...route.query };
      delete query.support;
      delete query.supportOrder;
      await router.replace({ query });
    }
  },
  { immediate: true },
);
const reset = () => {
  showThread.value = false;
  prechat.value = false;
};
const unregister = store.registerCleanup(reset);
onMounted(() => {
  if (store.activeId || store.draft) showThread.value = true;
});
onBeforeUnmount(unregister);
async function restoreFocus() {
  await nextTick();
  const value = launcher.value as unknown as { $el?: HTMLElement } | undefined;
  value?.$el?.focus();
}
</script>
<template>
  <div v-if="eligible" class="support-customer bookora-client-theme">
    <Button
      ref="launcher"
      class="support-launcher support-primary fixed z-40 size-13 cursor-pointer rounded-full shadow-lg sm:size-14"
      aria-label="Mở hỗ trợ khách hàng"
      :aria-expanded="visible"
      aria-controls="customer-support-chat"
      @click="launch"
      ><MessageCircle class="size-6" /><span
        v-if="store.unread"
        class="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full border-2 border-background bg-red-600 px-1 text-[10px] font-bold text-white"
        >{{ store.unread > 99 ? "99+" : store.unread }}</span
      ></Button
    >
    <Dialog :open="visible" @update:open="(value) => (store.open = value)"
      ><DialogContent
        id="customer-support-chat"
        class="support-customer support-window gap-0 overflow-hidden p-0 [&>button:last-child]:hidden"
        :class="store.expanded ? 'support-window-expanded' : ''"
        overlay-class="support-overlay"
        @close-auto-focus.prevent="restoreFocus"
      >
        <header
          class="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4"
        >
          <div class="flex items-center gap-2">
            <BookOpen class="size-5 text-green-800" /><DialogTitle
              class="text-sm font-bold"
              >Hỗ trợ khách hàng</DialogTitle
            >
          </div>
          <div class="flex items-center gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              class="hidden size-8 cursor-pointer sm:inline-flex"
              :aria-label="
                store.expanded ? 'Thu về kích thước gọn' : 'Mở rộng hỗ trợ'
              "
              @click="store.expanded = !store.expanded"
              ><Minimize2 v-if="store.expanded" class="size-4" /><Maximize2
                v-else
                class="size-4" /></Button
            ><Button
              size="icon"
              variant="ghost"
              class="size-8 cursor-pointer"
              aria-label="Thu nhỏ hỗ trợ"
              @click="store.open = false"
              ><Minus class="size-4" /></Button
            ><Button
              size="icon"
              variant="ghost"
              class="size-8 cursor-pointer"
              aria-label="Đóng hỗ trợ"
              @click="store.open = false"
              ><X class="size-4"
            /></Button>
          </div>
        </header>
        <DialogDescription class="sr-only"
          >Trao đổi riêng tư với đội ngũ hỗ trợ Bookora về tư vấn hoặc đơn hàng
          của bạn.</DialogDescription
        >
        <p
          v-if="store.status !== 'connected'"
          role="status"
          class="flex items-center gap-2 border-b bg-amber-50 px-4 py-2 text-[11px] text-amber-900"
        >
          <WifiOff class="size-3.5" />Đang kết nối lại. Tin nhắn đã lưu sẽ tự
          đồng bộ.
        </p>
        <p
          v-if="store.contextLoading"
          role="status"
          class="p-4 text-sm text-muted-foreground"
        >
          Đang mở hỗ trợ đơn hàng...
        </p>
        <div
          v-else
          class="support-customer-body min-h-0 flex-1"
          :class="{
            'support-split': store.expanded,
            'support-show-thread': showThread,
          }"
        >
          <div class="support-list-pane min-h-0 min-w-0">
            <SupportTicketList
              customer
              @select="
                showThread = true;
                prechat = false;
              "
              @start="start"
            />
          </div>
          <div class="support-thread-pane min-h-0 min-w-0">
            <SupportPrechat
              v-if="prechat || store.draft"
              :key="store.draft?.orderId ?? store.draft?.branchId ?? 'new'"
              @back="back"
            /><SupportThread
              v-else-if="store.activeId"
              customer
              :visible="showThread || store.expanded"
              @back="back"
            />
            <div
              v-else
              class="flex h-full flex-col items-center justify-center gap-3 p-6 text-center"
            >
              <BookOpen class="size-12 text-green-800/30" />
              <h2 class="text-base font-semibold">Cùng Bookora giải đáp</h2>
              <p class="max-w-60 text-xs leading-6 text-muted-foreground">
                Chọn một hội thoại hoặc bắt đầu trò chuyện khi bạn cần hỗ trợ.
              </p>
              <Button class="support-primary mt-2 cursor-pointer" @click="start"
                >Bắt đầu trò chuyện</Button
              >
            </div>
          </div>
        </div>
      </DialogContent></Dialog
    >
  </div>
</template>
