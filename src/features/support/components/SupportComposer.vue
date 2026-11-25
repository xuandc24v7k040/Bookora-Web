<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from "vue";
import { CircleAlert, Paperclip, RotateCcw, Send, Smile, X } from "@lucide/vue";
import type {
  SupportAttachmentDto,
  SupportMessageDto,
} from "@/api/generated/models";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import SupportEmojiPicker from "./SupportEmojiPicker.vue";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { uploadAttachment, discardAttachment } from "../api/support-api";
import { useSupportStore } from "../state/support.store";
import { supportError, isSupportAccessError } from "../support-errors";

interface StagedFile {
  key: string;
  file: File;
  preview: string;
  progress: number;
  state: "uploading" | "ready" | "failed";
  attachment?: SupportAttachmentDto;
  error?: string;
  controller: AbortController;
}
const props = defineProps<{ replyTo?: SupportMessageDto | null }>();
const emit = defineEmits<{ cancelReply: [] }>();
const store = useSupportStore();
const text = ref(""),
  files = ref<StagedFile[]>([]),
  error = ref("");
const fileInput = ref<HTMLInputElement>(),
  textarea = ref<HTMLTextAreaElement>();
const emojiOpen = ref(false);
const scopeKey = store.scope.key;
const count = computed(() => Array.from(text.value).length);
const busy = computed(() =>
  store.messages.some((m) => m.delivery === "sending"),
);
const sendable = computed(
  () =>
    store.canReply &&
    !busy.value &&
    count.value <= 4000 &&
    (!!text.value.trim() || files.value.some((f) => f.state === "ready")),
);
const accept = ".jpg,.jpeg,.png,.webp,.pdf,.mp4,.webm,.docx,.zip";
const mimeByExtension: Record<string, readonly string[]> = {
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  pdf: ["application/pdf"],
  mp4: ["video/mp4"],
  webm: ["video/webm"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  zip: ["application/zip", "application/x-zip-compressed"],
};
async function upload(item: StagedFile) {
  const scope = store.scope;
  item.state = "uploading";
  item.error = undefined;
  item.progress = 0;
  item.controller = new AbortController();
  try {
    const attachment = await uploadAttachment(
      scope,
      {
        file: item.file,
        ...(store.activeId
          ? { ticketId: store.activeId }
          : {
              type: store.draft!.type,
              branchId:
                store.draft!.type === "GENERAL"
                  ? store.draft!.branchId
                  : undefined,
              orderId:
                store.draft!.type === "ORDER"
                  ? store.draft!.orderId
                  : undefined,
            }),
      },
      {
        signal: item.controller.signal,
        timeout: 120_000,
        onUploadProgress: (progress) => {
          item.progress = progress.total
            ? Math.min(99, Math.round((progress.loaded / progress.total) * 100))
            : 0;
        },
      },
    );
    if (
      scope.key !== store.scope.key ||
      item.controller.signal.aborted ||
      !files.value.includes(item)
    ) {
      if (scope.key === store.scope.key)
        void discardAttachment(attachment.id).catch(() => undefined);
      return;
    }
    item.attachment = attachment;
    item.progress = 100;
    item.state = "ready";
  } catch (e) {
    if (!item.controller.signal.aborted && scope.key === store.scope.key) {
      item.state = "failed";
      item.error = supportError(e);
      if (isSupportAccessError(e)) store.fail(e);
    }
  }
}
function selectFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  for (const file of Array.from(input.files ?? [])) {
    if (files.value.length >= 5) {
      error.value = "Mỗi tin nhắn tối đa 5 tệp.";
      break;
    }
    const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
    if (file.size > 10 * 1024 * 1024 || file.size === 0) {
      error.value = "Mỗi tệp phải từ 1 byte đến 10 MiB.";
      continue;
    }
    if (
      !mimeByExtension[extension] ||
      (file.type && !mimeByExtension[extension]!.includes(file.type))
    ) {
      error.value = "Chỉ hỗ trợ ảnh JPG/PNG/WebP, PDF, MP4/WebM, DOCX và ZIP.";
      continue;
    }
    const item: StagedFile = {
      key: crypto.randomUUID(),
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      progress: 0,
      state: "uploading",
      controller: new AbortController(),
    };
    files.value.push(item);
    // Use the reactive item so progress is rendered throughout the real multipart request.
    void upload(files.value.at(-1)!);
  }
  input.value = "";
}
function remove(item: StagedFile, discard = true) {
  item.controller.abort();
  if (item.preview) URL.revokeObjectURL(item.preview);
  files.value = files.value.filter((f) => f.key !== item.key);
  if (discard && item.attachment && scopeKey === store.scope.key)
    void discardAttachment(item.attachment.id).catch(() => undefined);
}
function send() {
  if (!sendable.value) return;
  const ready = files.value.filter((f) => f.state === "ready" && f.attachment);
  if (
    !store.send(
      text.value,
      ready.map((f) => f.attachment!),
      props.replyTo ?? undefined,
    )
  )
    return;
  text.value = "";
  emit("cancelReply");
  ready.forEach((item) => remove(item, false));
  error.value = "";
  if (textarea.value) textarea.value.style.height = "";
}
function input() {
  store.inputTyping();
  if (textarea.value) {
    textarea.value.style.height = "auto";
    textarea.value.style.height = `${Math.min(textarea.value.scrollHeight, 120)}px`;
  }
}
function keydown(event: KeyboardEvent) {
  if (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.isComposing &&
    event.keyCode !== 229
  ) {
    event.preventDefault();
    send();
  }
}
async function emoji(value: string) {
  const start = textarea.value?.selectionStart ?? text.value.length;
  const end = textarea.value?.selectionEnd ?? start;
  text.value = text.value.slice(0, start) + value + text.value.slice(end);
  emojiOpen.value = false;
  await nextTick();
  textarea.value?.focus();
  textarea.value?.setSelectionRange(start + value.length, start + value.length);
  input();
}
const unregister = store.registerCleanup(() => {
  for (const item of files.value) remove(item, false);
  text.value = "";
});
onBeforeUnmount(() => {
  store.stopTyping();
  unregister();
  for (const item of [...files.value]) remove(item);
});
</script>
<template>
  <form
    class="support-composer shrink-0 border-t bg-background p-3"
    aria-label="Soạn tin nhắn hỗ trợ"
    @submit.prevent="send"
  >
    <div
      v-if="replyTo"
      class="mb-2 flex min-w-0 items-center gap-2 rounded-lg border-l-4 bg-muted/40 p-2 text-sm"
      aria-label="Đang trả lời"
    >
      <div class="min-w-0 flex-1">
        <strong class="block truncate">{{ replyTo.senderName }}</strong>
        <p class="truncate">{{ replyTo.text || "Tệp đính kèm" }}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="size-8 shrink-0"
        aria-label="Hủy trả lời"
        @click="emit('cancelReply')"
        ><X class="size-4"
      /></Button>
    </div>
    <ScrollArea
      v-if="files.length"
      class="support-file-tray mb-2"
      :style="{ height: `${Math.min(files.length * 76 + 48, 200)}px` }"
      aria-label="Tệp chờ gửi"
    >
      <div class="space-y-2 pr-3">
        <div
          v-for="item in files"
          :key="item.key"
          class="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/30 p-2"
        >
          <img
            v-if="item.preview"
            :src="item.preview"
            :alt="item.file.name"
            class="size-10 shrink-0 rounded object-cover"
          />
          <Paperclip v-else class="size-5 shrink-0 text-muted-foreground" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium" :title="item.file.name">
              {{ item.file.name }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ (item.file.size / 1024).toFixed(1) }} KiB
            </p>
            <p
              class="mt-0.5 text-[10px]"
              :class="
                item.state === 'failed'
                  ? 'text-red-700'
                  : 'text-muted-foreground'
              "
            >
              {{
                item.state === "ready"
                  ? "Sẵn sàng gửi"
                  : item.state === "failed"
                    ? item.error
                    : `Đang tải ${item.progress}%`
              }}
            </p>
            <div
              v-if="item.state === 'uploading'"
              class="mt-1 h-1 rounded-full bg-muted"
              role="progressbar"
              :aria-valuenow="item.progress"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-label="`Tải lên ${item.file.name}`"
            >
              <div
                class="support-upload-bar h-full rounded-full"
                :style="{ width: `${item.progress}%` }"
              />
            </div>
          </div>
          <Button
            v-if="item.state === 'failed'"
            type="button"
            size="icon"
            variant="ghost"
            class="size-7 cursor-pointer"
            aria-label="Tải lên lại"
            @click="upload(item)"
            ><RotateCcw class="size-3.5" /></Button
          ><Button
            type="button"
            size="icon"
            variant="ghost"
            class="size-7 cursor-pointer"
            :aria-label="`Bỏ tệp ${item.file.name}`"
            @click="remove(item)"
            ><X class="size-3.5"
          /></Button>
        </div>
        <Button
          type="button"
          variant="outline"
          class="support-add-file h-10 w-full cursor-pointer border-dashed"
          :disabled="files.length >= 5 || !store.canReply"
          @click="fileInput?.click()"
          >+ Thêm tệp</Button
        >
      </div>
    </ScrollArea>
    <p
      v-if="error"
      role="alert"
      class="mb-2 flex items-center gap-1 text-xs text-red-700"
    >
      <CircleAlert class="size-3.5 shrink-0" />{{ error }}
    </p>
    <div
      class="flex items-end gap-1.5 rounded-xl border bg-muted/20 p-1.5 focus-within:ring-2 focus-within:ring-ring/30"
    >
      <textarea
        ref="textarea"
        v-model="text"
        aria-label="Tin nhắn hỗ trợ"
        placeholder="Nhập tin nhắn..."
        rows="1"
        class="max-h-30 min-h-8 min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-5 outline-none disabled:cursor-not-allowed"
        :disabled="!store.canReply"
        @input="input"
        @keydown="keydown"
        @blur="store.stopTyping"
      />
      <Popover v-model:open="emojiOpen"
        ><PopoverTrigger as-child
          ><Button
            type="button"
            size="icon"
            variant="ghost"
            class="size-8 shrink-0 cursor-pointer"
            aria-label="Chọn biểu tượng cảm xúc"
            :disabled="!store.canReply"
            ><Smile class="size-4" /></Button></PopoverTrigger
        ><PopoverContent
          class="support-emoji-popover z-[85] w-[min(22rem,calc(100vw-1rem))] p-0"
          :class="store.isCustomer ? 'support-customer' : ''"
          align="end"
          ><SupportEmojiPicker
            v-if="emojiOpen"
            @select="emoji" /></PopoverContent
      ></Popover>
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        :accept="accept"
        multiple
        aria-label="Chọn tệp hỗ trợ"
        @change="selectFiles"
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        class="size-8 shrink-0 cursor-pointer"
        aria-label="Đính kèm tệp"
        :disabled="!store.canReply || files.length >= 5"
        @click="fileInput?.click()"
        ><Paperclip class="size-4"
      /></Button>
      <Button
        type="submit"
        size="icon"
        class="support-primary size-8 shrink-0 cursor-pointer rounded-full"
        aria-label="Gửi tin nhắn hỗ trợ"
        :disabled="!sendable"
        ><Send class="size-4"
      /></Button>
    </div>
    <div
      class="mt-1.5 flex flex-wrap items-center justify-between gap-1 px-1 text-[10px] text-muted-foreground"
    >
      <span>Ảnh, PDF, video, DOCX, ZIP · 10 MiB/tệp · tối đa 5 tệp</span
      ><span v-if="count > 3500" :class="count > 4000 ? 'text-red-700' : ''"
        >{{ count }}/4.000</span
      >
    </div>
  </form>
</template>
