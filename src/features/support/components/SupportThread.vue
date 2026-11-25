<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import {
  ArrowDown,
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  Download,
  Info,
  Reply,
  RotateCcw,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/date-format";
import { toast } from "vue-sonner";
import type { SupportMessageDto } from "@/api/generated/models";
import { useAuthStore } from "@/stores/auth.store";
import { useSupportStore } from "../state/support.store";
import { useSupportOrderContext } from "../api/support-queries";
import SupportStatus from "./SupportStatus.vue";
import SupportAttachment from "./SupportAttachment.vue";
import SupportComposer from "./SupportComposer.vue";
import SupportManageActions from "./SupportManageActions.vue";
import SupportAvatar from "./SupportAvatar.vue";

const props = withDefaults(
  defineProps<{ customer?: boolean; visible?: boolean }>(),
  { visible: true },
);
const emit = defineEmits<{ back: []; context: [] }>();
const store = useSupportStore(),
  auth = useAuthStore();
const order = useSupportOrderContext();
const root = ref<HTMLElement>(),
  atBottom = ref(true),
  newCount = ref(0);
const replyTo = ref<SupportMessageDto | null>(null);
const highlighted = ref("");
const copyFeedback = ref("");
const copiedMessageId = ref("");
const attachmentViews = ref<InstanceType<typeof SupportAttachment>[]>([]);
let highlightTimer: ReturnType<typeof setTimeout> | undefined;
let copyTimer: ReturnType<typeof setTimeout> | undefined;
const unregisterQuote = store.registerCleanup(() => {
  replyTo.value = null;
});
async function copy(message: SupportMessageDto) {
  const threadKey = store.threadKey;
  try {
    await navigator.clipboard.writeText(message.text ?? "");
    if (threadKey !== store.threadKey) return;
    copyFeedback.value = "Đã sao chép tin nhắn";
    copiedMessageId.value = message.id;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copiedMessageId.value = "";
    }, 1500);
  } catch {
    copyFeedback.value = "Không thể sao chép. Hãy thử lại.";
  }
}
async function downloadImages(message: SupportMessageDto) {
  for (const attachment of message.attachments) {
    if (!attachment.mimeType.startsWith("image/")) continue;
    const view = attachmentViews.value.find(
      (item) => item.$props.attachment.id === attachment.id,
    );
    await view?.download();
  }
}
function findOriginal(id: string) {
  const original = root.value?.querySelector<HTMLElement>(
    `[data-message-id="${CSS.escape(id)}"]`,
  );
  if (!original) {
    toast.info("Tin nhắn ở phần lịch sử cũ. Chọn Xem tin nhắn cũ hơn để tìm.");
    return;
  }
  original.scrollIntoView({ block: "center", behavior: "instant" });
  highlighted.value = id;
  if (highlightTimer) clearTimeout(highlightTimer);
  highlightTimer = setTimeout(() => {
    highlighted.value = "";
  }, 1800);
}
let viewport: HTMLElement | null = null,
  observer: IntersectionObserver | undefined,
  resize: ResizeObserver | undefined;
let readTimer: ReturnType<typeof setTimeout> | undefined,
  visibleSequence = 0,
  paging = false;
const thread = computed(() => store.threads[store.threadKey]);
const typing = computed(
  () => !!store.activeId && (store.typing[store.activeId] ?? 0) > 0,
);
const dayFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  dateStyle: "medium",
});
const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const day = (date: string) => dayFormatter.format(new Date(date));
const time = (date: string) => timeFormatter.format(new Date(date));
function bottom() {
  if (viewport) viewport.scrollTop = viewport.scrollHeight;
  atBottom.value = true;
  newCount.value = 0;
}
function scroll() {
  if (viewport)
    atBottom.value =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 70;
  if (atBottom.value) newCount.value = 0;
}
function observeRead() {
  observer?.disconnect();
  if (!viewport || !props.visible) return;
  const observedTicketId = store.activeId;
  observer = new IntersectionObserver(
    (entries) => {
      if (
        !props.visible ||
        store.activeId !== observedTicketId ||
        document.visibilityState !== "visible" ||
        !root.value?.getClientRects().length
      )
        return;
      for (const entry of entries)
        if (entry.isIntersecting)
          visibleSequence = Math.max(
            visibleSequence,
            Number((entry.target as HTMLElement).dataset.readSequence),
          );
      if (readTimer) clearTimeout(readTimer);
      readTimer = setTimeout(() => {
        if (
          props.visible &&
          store.activeId === observedTicketId &&
          visibleSequence > 0 &&
          root.value?.getClientRects().length
        )
          void store.markRead(visibleSequence);
      }, 160);
    },
    { root: viewport, threshold: 1 },
  );
  root.value
    ?.querySelectorAll("[data-read-sequence]")
    .forEach((el) => observer?.observe(el));
}
async function older() {
  if (!store.activeId || !viewport) return;
  paging = true;
  const previousHeight = viewport.scrollHeight,
    previousTop = viewport.scrollTop;
  await store.loadHistory(store.activeId, true);
  await nextTick();
  viewport.scrollTop = previousTop + viewport.scrollHeight - previousHeight;
  paging = false;
  observeRead();
}
function setup() {
  viewport?.removeEventListener("scroll", scroll);
  viewport =
    root.value?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    ) ?? null;
  viewport?.addEventListener("scroll", scroll, { passive: true });
  resize?.disconnect();
  const content = viewport?.firstElementChild;
  if (content) {
    resize = new ResizeObserver(() => {
      if (!paging && atBottom.value) bottom();
    });
    resize.observe(content);
  }
  bottom();
  observeRead();
}
watch(
  () => store.threadKey,
  async () => {
    replyTo.value = null;
    copiedMessageId.value = "";
    if (copyTimer) clearTimeout(copyTimer);
    visibleSequence = 0;
    newCount.value = 0;
    atBottom.value = true;
    await nextTick();
    setup();
  },
);
watch(
  () => [
    store.messages.length,
    store.messages.at(-1)?.id,
    store.active?.assigneeId,
    props.visible,
  ],
  async () => {
    await nextTick();
    if (!viewport) setup();
    const last = store.messages.at(-1);
    if (!paging && (atBottom.value || last?.senderUserId === auth.user?.id))
      bottom();
    else if (!paging) newCount.value++;
    observeRead();
  },
  { flush: "post" },
);
const visibility = () => {
  if (document.visibilityState === "visible") observeRead();
};
onMounted(() => {
  setup();
  document.addEventListener("visibilitychange", visibility);
});
onBeforeUnmount(() => {
  unregisterQuote();
  if (highlightTimer) clearTimeout(highlightTimer);
  if (copyTimer) clearTimeout(copyTimer);
  store.stopTyping();
  observer?.disconnect();
  resize?.disconnect();
  viewport?.removeEventListener("scroll", scroll);
  if (readTimer) clearTimeout(readTimer);
  document.removeEventListener("visibilitychange", visibility);
});
</script>
<template>
  <section
    ref="root"
    class="flex h-full min-h-0 min-w-0 flex-col bg-background"
    aria-label="Hội thoại hỗ trợ"
  >
    <span class="sr-only" role="status" aria-live="polite">{{
      copyFeedback
    }}</span>
    <template v-if="store.active">
      <header
        class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b p-3"
      >
        <div class="flex min-w-0 items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            class="size-8 shrink-0 cursor-pointer"
            aria-label="Trở lại danh sách hội thoại"
            @click="emit('back')"
            ><ArrowLeft class="size-4" /></Button
          ><SupportAvatar
            v-if="!customer"
            :name="store.active.customerName"
            :url="store.active.customerAvatarUrl"
          /><span
            v-else
            class="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted"
            ><BookOpen class="size-5 text-green-800"
          /></span>
          <div class="min-w-0">
            <h2 class="truncate text-sm font-bold">
              {{
                customer ? store.active.branchName : store.active.customerName
              }}
            </h2>
            <p class="mt-0.5 truncate text-[11px] text-muted-foreground">
              {{
                store.active.type === "ORDER"
                  ? (order.data.value?.orderCode ?? "Hỗ trợ đơn hàng")
                  : "Tư vấn chung"
              }}<template v-if="store.active.subject">
                · {{ store.active.subject }}</template
              >
            </p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
          <SupportStatus
            :status="store.active.status"
            :customer="customer"
          /><SupportManageActions v-if="!customer" /><Button
            v-if="!customer"
            size="icon"
            variant="ghost"
            class="size-8 cursor-pointer"
            aria-label="Thông tin hỗ trợ"
            @click="emit('context')"
            ><Info class="size-4"
          /></Button>
        </div>
      </header>
    </template>
    <header
      v-else-if="store.draft"
      class="flex items-center gap-2 border-b p-3"
    >
      <Button
        size="icon"
        variant="ghost"
        class="size-8 cursor-pointer"
        aria-label="Trở lại danh sách hội thoại"
        @click="emit('back')"
        ><ArrowLeft class="size-4"
      /></Button>
      <div>
        <h2 class="text-sm font-bold">
          {{
            store.draft.type === "ORDER"
              ? (store.draft.orderCode ?? "Hỗ trợ đơn hàng")
              : "Yêu cầu hỗ trợ mới"
          }}
        </h2>
        <p class="mt-0.5 text-[11px] text-muted-foreground">
          Hội thoại được tạo khi tin nhắn đầu tiên gửi thành công.
        </p>
      </div>
    </header>
    <div
      v-if="store.error"
      role="alert"
      class="shrink-0 border-b border-amber-100 bg-amber-50 p-3 text-xs text-amber-900"
    >
      {{ store.error }}
    </div>
    <div class="relative flex min-h-0 flex-1 flex-col">
      <ScrollArea class="min-h-0 flex-1">
        <div class="space-y-3 p-3 sm:p-4">
          <Button
            v-if="thread?.before !== null && thread?.before !== undefined"
            variant="outline"
            size="sm"
            class="mx-auto flex cursor-pointer text-xs"
            :disabled="thread.loading"
            @click="older"
            >{{
              thread.loading ? "Đang tải..." : "Xem tin nhắn cũ hơn"
            }}</Button
          >
          <template v-if="thread?.loading && !store.messages.length"
            ><Skeleton
              v-for="n in 3"
              :key="n"
              class="h-16 w-3/4 rounded-xl even:ml-auto"
          /></template>
          <div
            v-if="thread?.error"
            role="alert"
            class="rounded-lg border p-3 text-xs text-red-700"
          >
            {{ thread.error
            }}<Button
              v-if="store.activeId"
              variant="ghost"
              class="cursor-pointer"
              @click="store.loadHistory(store.activeId)"
              >Thử lại</Button
            >
          </div>
          <div
            v-if="!store.messages.length && !thread?.loading"
            class="px-4 py-10 text-center"
          >
            <BookOpen class="mx-auto size-10 text-muted-foreground/40" />
            <p class="mt-3 text-sm font-medium">
              Bookora luôn sẵn sàng lắng nghe
            </p>
            <p class="mt-2 text-xs leading-5 text-muted-foreground">
              Chia sẻ câu hỏi và đính kèm thông tin cần thiết để được hỗ trợ.
            </p>
          </div>
          <div
            v-for="(message, index) in store.messages"
            :key="message.id"
            v-memo="[
              message,
              message.delivery,
              message.error,
              store.canReply,
              highlighted === message.id,
              copiedMessageId === message.id,
              customer,
              auth.user?.id,
              store.messages[index - 1]?.id,
              message.sequence <=
                (customer
                  ? (store.active?.assigneeReadSequence ?? 0)
                  : (store.active?.customerReadSequence ?? 0)),
            ]"
          >
            <p
              v-if="
                index === 0 ||
                day(message.createdAt) !==
                  day(store.messages[index - 1]!.createdAt)
              "
              class="py-1 text-center text-[10px] text-muted-foreground"
            >
              {{ day(message.createdAt) }}
            </p>
            <div
              class="group/message flex min-w-0 gap-2 rounded-lg transition-colors"
              :class="
                message.senderUserId === auth.user?.id
                  ? 'support-message-outgoing justify-end'
                  : 'support-message-incoming justify-start'
              "
              :data-message-id="message.id"
              :data-highlighted="highlighted === message.id || undefined"
              :data-client-message-id="message.clientMessageId"
              :data-delivery="message.delivery ?? 'sent'"
            >
              <span
                v-if="message.senderUserId !== auth.user?.id"
                class="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold"
                ><SupportAvatar
                  v-if="!customer"
                  :name="message.senderName"
                  :url="message.senderAvatarUrl" /><BookOpen
                  v-if="customer"
                  class="size-4 text-green-800"
              /></span>
              <div
                class="support-message-content min-w-0"
                :class="
                  message.attachments.some((a) =>
                    a.mimeType.startsWith('image/'),
                  )
                    ? 'w-full'
                    : ''
                "
              >
                <div class="relative">
                  <div
                    class="support-bubble min-w-0 space-y-2 rounded-2xl px-3 py-3 text-[15px] leading-6"
                    :class="
                      message.senderUserId === auth.user?.id
                        ? 'support-bubble-own rounded-br-sm'
                        : 'rounded-bl-sm border bg-muted/40'
                    "
                  >
                    <button
                      v-if="message.replyToMessageId"
                      type="button"
                      class="support-quote block w-full min-w-0 cursor-pointer rounded-lg border-l-4 bg-black/5 p-2 text-left text-sm"
                      aria-label="Xem tin nhắn gốc"
                      @click="findOriginal(message.replyToMessageId)"
                    >
                      <strong class="block truncate">{{
                        message.replyTo?.senderName || "Tin nhắn trước đó"
                      }}</strong>
                      <span class="line-clamp-2 [overflow-wrap:anywhere]">{{
                        message.replyTo?.text ||
                        (message.replyTo?.attachmentCount
                          ? "Tệp đính kèm"
                          : "Tin nhắn không còn khả dụng")
                      }}</span>
                    </button>
                    <p
                      v-if="message.text"
                      class="whitespace-pre-wrap [overflow-wrap:anywhere]"
                      data-message-text
                    >
                      {{ message.text }}
                    </p>
                    <SupportAttachment
                      v-for="attachment in message.attachments"
                      ref="attachmentViews"
                      :key="attachment.id"
                      :attachment="attachment"
                      :pending="!!message.delivery"
                    />
                  </div>
                  <div
                    class="support-message-actions"
                    role="group"
                    aria-label="Thao tác tin nhắn"
                  >
                    <Button
                      v-if="store.canReply && !message.delivery"
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="support-message-action"
                      title="Trả lời"
                      aria-label="Trả lời tin nhắn"
                      @click="replyTo = message"
                      ><Reply class="size-3.5"
                    /></Button>
                    <Button
                      v-if="message.text"
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="support-message-action"
                      :title="
                        copiedMessageId === message.id
                          ? 'Đã sao chép'
                          : 'Sao chép tin nhắn'
                      "
                      aria-label="Sao chép tin nhắn"
                      @click="copy(message)"
                      ><Check
                        v-if="copiedMessageId === message.id"
                        class="support-copy-check size-3.5" /><Copy
                        v-else
                        class="size-3.5"
                    /></Button>
                    <Button
                      v-if="
                        !message.delivery &&
                        message.attachments.some((attachment) =>
                          attachment.mimeType.startsWith('image/'),
                        )
                      "
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="support-message-action"
                      title="Tải ảnh"
                      aria-label="Tải ảnh trong tin nhắn"
                      @click="downloadImages(message)"
                      ><Download class="size-3.5"
                    /></Button>
                  </div>
                </div>
                <div
                  class="mt-1 flex flex-wrap items-center gap-1 px-1 text-[9px] text-muted-foreground"
                  :class="
                    message.senderUserId === auth.user?.id ? 'justify-end' : ''
                  "
                >
                  <time
                    :datetime="message.createdAt"
                    :title="formatDateTime(message.createdAt)"
                    >{{ time(message.createdAt) }}</time
                  ><span v-if="message.senderUserId === auth.user?.id"
                    >·
                    {{
                      message.delivery === "sending"
                        ? "Đang gửi"
                        : message.delivery === "failed"
                          ? "Gửi chưa thành công"
                          : store.active &&
                              message.sequence <=
                                (customer
                                  ? store.active.assigneeReadSequence
                                  : store.active.customerReadSequence)
                            ? "Đã xem"
                            : "Đã gửi"
                    }}</span
                  ><button
                    v-if="message.delivery === 'failed'"
                    type="button"
                    class="ml-1 inline-flex cursor-pointer items-center gap-1 font-semibold text-red-700 underline"
                    :disabled="!store.canReply"
                    @click="store.retry(message.clientMessageId)"
                  >
                    <RotateCcw class="size-3" />Gửi lại
                  </button>
                </div>
                <p
                  v-if="message.error"
                  class="mt-1 text-[10px] text-red-700"
                  role="alert"
                >
                  {{ message.error }}
                </p>
                <span
                  v-if="!message.delivery"
                  class="block h-px"
                  :data-read-sequence="message.sequence"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
      <Button
        v-if="newCount && !atBottom"
        size="sm"
        variant="outline"
        class="absolute bottom-3 left-1/2 -translate-x-1/2 cursor-pointer rounded-full bg-background shadow-md"
        @click="bottom"
        ><ArrowDown class="size-3.5" />Tin nhắn mới ({{ newCount }})</Button
      >
    </div>
    <div
      class="h-6 shrink-0 px-4 text-[11px] text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <span v-if="typing" class="inline-flex items-center gap-1.5"
        ><span class="support-typing inline-flex gap-0.5"><i /><i /><i /></span
        >{{
          customer ? "Bookora đang nhập..." : "Khách hàng đang nhập..."
        }}</span
      >
    </div>
    <div
      v-if="store.active?.status === 'RESOLVED'"
      class="shrink-0 space-y-2 border-t bg-muted/25 p-3 text-center"
    >
      <p class="text-xs text-muted-foreground">
        Yêu cầu đã được giải quyết. Lịch sử được giữ lại.
      </p>
      <div v-if="customer" class="flex flex-wrap justify-center gap-2">
        <Button
          class="support-primary cursor-pointer text-xs"
          size="sm"
          :disabled="store.actionLoading"
          @click="store.action('reopen')"
          >Tiếp tục hỗ trợ</Button
        ><Button
          variant="outline"
          size="sm"
          class="cursor-pointer text-xs"
          @click="
            store.startDraft({
              type: store.active.type,
              branchId: store.active.branchId,
              orderId: store.active.orderId ?? undefined,
              orderCode: order.data.value?.orderCode,
              subject: store.active.subject ?? undefined,
            })
          "
          >Tạo yêu cầu mới</Button
        >
      </div>
    </div>
    <SupportComposer
      v-else-if="store.canReply"
      :key="store.threadKey"
      :reply-to="replyTo"
      @cancel-reply="replyTo = null"
    />
    <p
      v-else-if="store.active"
      class="shrink-0 border-t bg-muted/30 p-4 text-center text-xs leading-5 text-muted-foreground"
    >
      {{
        store.active.status === "OPEN"
          ? "Nhận xử lý hội thoại để trả lời khách hàng."
          : "Chỉ nhân viên đang phụ trách có quyền trả lời. Bạn đang xem ở chế độ chỉ đọc."
      }}
    </p>
  </section>
</template>
