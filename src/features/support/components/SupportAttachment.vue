<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import {
  Download,
  FileText,
  Film,
  ImageOff,
  LoaderCircle,
  Maximize2,
  Package,
} from "@lucide/vue";
import type { SupportAttachmentDto } from "@/api/generated/models";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { attachmentContent } from "../api/support-api";
import { useSupportStore } from "../state/support.store";
import { supportError, isSupportAccessError } from "../support-errors";

const SupportPdfViewer = defineAsyncComponent(
  () => import("./SupportPdfViewer.vue"),
);

const props = defineProps<{
  attachment: SupportAttachmentDto;
  pending?: boolean;
}>();
const store = useSupportStore();
const root = ref<HTMLElement>(),
  url = ref(""),
  loading = ref(false),
  error = ref(""),
  preview = ref(false);
const image = computed(() => props.attachment.mimeType.startsWith("image/"));
const video = computed(() => props.attachment.mimeType.startsWith("video/"));
const pdf = computed(() => props.attachment.mimeType === "application/pdf");
const pdfBlob = shallowRef<Blob>();
const downloadUrls = new Map<string, ReturnType<typeof setTimeout>>();
let controller = new AbortController(),
  observer: IntersectionObserver | undefined;
const size = computed(() =>
  props.attachment.size < 1024 * 1024
    ? `${(props.attachment.size / 1024).toFixed(1)} KiB`
    : `${(props.attachment.size / 1024 / 1024).toFixed(1)} MiB`,
);
function clear() {
  controller.abort();
  controller = new AbortController();
  preview.value = false;
  loading.value = false;
  pdfBlob.value = undefined;
  for (const [downloadUrl, timer] of downloadUrls) {
    clearTimeout(timer);
    URL.revokeObjectURL(downloadUrl);
  }
  downloadUrls.clear();
  if (url.value) URL.revokeObjectURL(url.value);
  url.value = "";
}
const unregister = store.registerCleanup(clear);
watch(() => store.mediaEpoch, clear);
watch(preview, (open) => {
  if (!open && pdf.value) clear();
});
async function load(fresh = false): Promise<Blob | undefined> {
  if (
    (!fresh && (url.value || pdfBlob.value)) ||
    loading.value ||
    props.pending
  )
    return;
  const scope = store.scope;
  const request = controller;
  loading.value = true;
  error.value = "";
  try {
    const blob = await attachmentContent(
      scope,
      props.attachment.id,
      request.signal,
    );
    if (scope.key !== store.scope.key || request.signal.aborted) return;
    const content = new Blob([blob], { type: props.attachment.mimeType });
    if (pdf.value) {
      if (!fresh) pdfBlob.value = content;
    } else url.value = URL.createObjectURL(content);
    return content;
  } catch (e) {
    if (!request.signal.aborted && scope.key === store.scope.key) {
      error.value = supportError(e);
      if (isSupportAccessError(e)) store.fail(e);
    }
  } finally {
    if (request === controller) loading.value = false;
  }
}
async function show() {
  if (pdf.value) {
    // Reauthorize every open; do not revive a cached private document.
    clear();
    preview.value = true;
    await load();
    return;
  }
  await load();
  if (url.value) preview.value = true;
}
async function download() {
  if (pdf.value) {
    // Download also revalidates current permissions even while a preview is open.
    const blob = await load(true);
    if (!blob) return;
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = props.attachment.filename;
    a.click();
    downloadUrls.set(
      downloadUrl,
      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
        downloadUrls.delete(downloadUrl);
      }, 1000),
    );
    return;
  }
  await load();
  if (!url.value) return;
  const a = document.createElement("a");
  a.href = url.value;
  a.download = props.attachment.filename;
  a.click();
}
defineExpose({ download });
onMounted(() => {
  if (!image.value || props.pending) return;
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        void load();
        observer?.disconnect();
      }
    },
    { rootMargin: "100px" },
  );
  if (root.value) observer.observe(root.value);
});
watch(
  () => props.pending,
  (pending) => {
    if (!pending && image.value) void load();
  },
);
onBeforeUnmount(() => {
  observer?.disconnect();
  unregister();
  clear();
});
</script>
<template>
  <div ref="root" class="min-w-0" :data-attachment-id="attachment.id">
    <button
      v-if="image && url"
      type="button"
      class="group relative block w-full cursor-pointer overflow-hidden rounded-xl border bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :aria-label="`Xem ảnh ${attachment.filename}`"
      @click="show"
    >
      <img
        :src="url"
        :alt="attachment.filename"
        class="max-h-80 w-full min-w-0 object-contain"
        loading="lazy"
      /><span
        class="absolute right-2 bottom-2 rounded-md bg-black/60 p-1.5 text-white group-hover:bg-black/80"
        ><Maximize2 class="size-4"
      /></span>
    </button>
    <div
      v-else
      class="flex min-w-0 items-center gap-2.5 rounded-lg border bg-background/80 p-2.5 text-foreground"
    >
      <LoaderCircle
        v-if="loading"
        class="size-6 shrink-0 animate-spin text-muted-foreground"
      /><ImageOff
        v-else-if="image"
        class="size-6 shrink-0 text-green-700"
      /><Film
        v-else-if="video"
        class="size-6 shrink-0 text-violet-700"
      /><Package
        v-else-if="attachment.mimeType.includes('zip')"
        class="size-6 shrink-0 text-amber-600"
      /><FileText
        v-else
        class="size-6 shrink-0"
        :class="pdf ? 'text-red-600' : 'text-muted-foreground'"
      />
      <div class="min-w-0 flex-1">
        <p class="break-all text-xs font-semibold">{{ attachment.filename }}</p>
        <p class="mt-0.5 text-[10px] text-muted-foreground">
          {{ size }}<template v-if="pending"> · Đang gửi</template>
        </p>
      </div>
      <Button
        v-if="!pending && (video || pdf || image)"
        size="sm"
        variant="outline"
        class="h-7 cursor-pointer px-2 text-[10px]"
        :disabled="loading"
        @click="show"
        >{{ video ? "Phát" : "Xem" }}</Button
      >
      <Button
        v-if="!pending && !image"
        size="icon"
        variant="ghost"
        class="size-8 shrink-0 cursor-pointer"
        :aria-label="`Tải xuống ${attachment.filename}`"
        :disabled="loading"
        @click="download"
        ><Download class="size-4"
      /></Button>
    </div>
    <p v-if="error" class="mt-1 text-xs text-red-700" role="alert">
      {{ error }}
      <button type="button" class="cursor-pointer underline" @click="load()">
        Thử lại
      </button>
    </p>
    <Dialog v-model:open="preview"
      ><DialogContent
        class="z-[80] max-h-[90dvh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto"
        :class="store.isCustomer ? 'support-customer' : ''"
        overlay-class="z-[79]"
        ><DialogHeader
          ><DialogTitle class="break-all pr-6 text-sm">{{
            attachment.filename
          }}</DialogTitle
          ><DialogDescription
            >Tệp riêng tư trong hội thoại hỗ trợ · {{ size }}</DialogDescription
          ></DialogHeader
        >
        <img
          v-if="image && url"
          :src="url"
          :alt="attachment.filename"
          class="max-h-[65dvh] w-full object-contain"
        />
        <video
          v-else-if="video && url"
          :src="url"
          controls
          preload="metadata"
          class="max-h-[65dvh] w-full rounded-lg"
        >
          Trình duyệt không phát được video này. Hãy tải tệp để xem.
        </video>
        <SupportPdfViewer
          v-else-if="pdf && preview && pdfBlob"
          :file="pdfBlob"
        />
        <template v-else-if="pdf">
          <p
            v-if="loading"
            class="flex items-center gap-2 py-6 text-sm text-muted-foreground"
            role="status"
          >
            <LoaderCircle class="size-4 animate-spin" />Đang tải PDF…
          </p>
          <div v-else-if="error" role="alert" class="space-y-2 text-sm">
            <p>{{ error }}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="cursor-pointer"
              @click="load()"
              >Thử tải PDF lại</Button
            >
          </div>
        </template>
        <Button
          class="support-primary cursor-pointer"
          :disabled="loading"
          @click="download"
          ><Download class="size-4" />Tải xuống</Button
        >
      </DialogContent></Dialog
    >
  </div>
</template>
