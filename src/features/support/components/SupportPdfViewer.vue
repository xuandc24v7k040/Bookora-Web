<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  ZoomIn,
  ZoomOut,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const props = defineProps<{ file: Blob }>();
const container = ref<HTMLElement>();
const canvas = ref<HTMLCanvasElement>();
const width = ref(0);
const pageNumber = ref(1);
const pageCount = ref(0);
const zoom = ref(1);
const busy = ref(true);
const error = ref("");
let pdf: PDFDocumentProxy | undefined;
let loadingTask: PDFDocumentLoadingTask | undefined;
let renderTask: RenderTask | undefined;
let resize: ResizeObserver | undefined;
let disposed = false;
let renderSequence = 0;

async function renderPage() {
  const document = pdf;
  const target = canvas.value;
  if (!document || !target || !width.value || disposed) return;
  const sequence = ++renderSequence;
  const previous = renderTask;
  previous?.cancel();
  busy.value = true;
  error.value = "";
  try {
    // A canvas cannot be used by two PDF.js render tasks at once.
    await previous?.promise.catch(() => undefined);
    if (disposed || sequence !== renderSequence) return;
    const page = await document.getPage(pageNumber.value);
    if (disposed || sequence !== renderSequence) return;
    const natural = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({
      scale: ((width.value - 24) / natural.width) * zoom.value,
    });
    // Bound the backing bitmap on high-DPI screens and unusually large pages.
    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      2,
      Math.sqrt(16_000_000 / (viewport.width * viewport.height)),
      8192 / Math.max(viewport.width, viewport.height),
    );
    target.width = Math.max(1, Math.floor(viewport.width * pixelRatio));
    target.height = Math.max(1, Math.floor(viewport.height * pixelRatio));
    target.style.width = `${viewport.width}px`;
    target.style.height = `${viewport.height}px`;
    const context = target.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    renderTask = page.render({
      canvas: target,
      canvasContext: context,
      viewport,
      transform: [pixelRatio, 0, 0, pixelRatio, 0, 0],
      background: "white",
    });
    await renderTask.promise;
  } catch {
    if (!disposed && sequence === renderSequence)
      error.value =
        "Không thể hiển thị trang PDF. Bạn vẫn có thể tải tệp xuống.";
  } finally {
    if (!disposed && sequence === renderSequence) busy.value = false;
  }
}
async function open() {
  busy.value = true;
  error.value = "";
  try {
    await loadingTask?.destroy();
    const [pdfjs, worker, data] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
      props.file.arrayBuffer(),
    ]);
    if (disposed) return;
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const assets = `${import.meta.env.BASE_URL}pdfjs/${pdfjs.version}/`;
    // Render pixels only: no PDF scripting, active annotations, HTML or XFA layer.
    loadingTask = pdfjs.getDocument({
      data: new Uint8Array(data),
      enableXfa: false,
      cMapUrl: `${assets}cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `${assets}standard_fonts/`,
      wasmUrl: `${assets}wasm/`,
      iccUrl: `${assets}iccs/`,
      canvasMaxAreaInBytes: 64_000_000,
    });
    const document = await loadingTask.promise;
    if (disposed) return;
    pdf = document;
    pageCount.value = document.numPages;
    pageNumber.value = 1;
    await renderPage();
  } catch {
    if (!disposed) {
      busy.value = false;
      error.value =
        "Không mở được PDF. Tệp có thể bị lỗi hoặc có mật khẩu. Bạn vẫn có thể tải xuống.";
    }
  }
}
watch([pageNumber, zoom, width], () => void renderPage());
onMounted(() => {
  width.value = container.value?.clientWidth ?? 0;
  resize = new ResizeObserver(() => {
    width.value = container.value?.clientWidth ?? 0;
  });
  if (container.value) resize.observe(container.value);
  void open();
});
onBeforeUnmount(() => {
  disposed = true;
  renderSequence++;
  resize?.disconnect();
  renderTask?.cancel();
  void loadingTask?.destroy().catch(() => undefined);
  pdf = undefined;
  if (canvas.value) canvas.value.width = canvas.value.height = 0;
});
</script>
<template>
  <section
    ref="container"
    class="min-w-0 max-w-full space-y-2"
    aria-label="Trình xem PDF"
    :aria-busy="busy"
  >
    <div
      class="flex flex-wrap items-center justify-between gap-2"
      role="toolbar"
      aria-label="Điều khiển PDF"
    >
      <div class="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          class="size-8 cursor-pointer"
          aria-label="Trang PDF trước"
          :disabled="busy || pageNumber <= 1"
          @click="pageNumber--"
          ><ChevronLeft class="size-4"
        /></Button>
        <output
          class="min-w-20 text-center text-xs tabular-nums"
          aria-live="polite"
          >Trang {{ pageNumber }} / {{ pageCount || "…" }}</output
        >
        <Button
          type="button"
          variant="outline"
          size="icon"
          class="size-8 cursor-pointer"
          aria-label="Trang PDF sau"
          :disabled="busy || pageNumber >= pageCount"
          @click="pageNumber++"
          ><ChevronRight class="size-4"
        /></Button>
      </div>
      <div class="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          class="size-8 cursor-pointer"
          aria-label="Thu nhỏ PDF"
          :disabled="busy || zoom <= 0.5"
          @click="zoom -= 0.25"
          ><ZoomOut class="size-4"
        /></Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="h-8 cursor-pointer px-2 text-xs tabular-nums"
          title="Vừa chiều rộng"
          aria-label="PDF vừa chiều rộng"
          :disabled="busy"
          @click="zoom = 1"
          >{{ Math.round(zoom * 100) }}%</Button
        >
        <Button
          type="button"
          variant="outline"
          size="icon"
          class="size-8 cursor-pointer"
          aria-label="Phóng to PDF"
          :disabled="busy || zoom >= 2"
          @click="zoom += 0.25"
          ><ZoomIn class="size-4"
        /></Button>
      </div>
    </div>
    <p
      v-if="busy"
      class="flex items-center gap-2 text-xs text-muted-foreground"
      role="status"
    >
      <LoaderCircle class="size-4 animate-spin" />Đang hiển thị PDF…
    </p>
    <div
      v-if="error"
      class="space-y-2 rounded-md border p-3 text-sm"
      role="alert"
    >
      <p>{{ error }}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="cursor-pointer"
        @click="open"
        >Thử lại PDF</Button
      >
    </div>
    <ScrollArea
      v-show="!error"
      class="h-[55dvh] max-h-[32rem] min-w-0 rounded-md border bg-muted/30"
    >
      <div class="w-max min-w-full p-2">
        <canvas
          ref="canvas"
          class="mx-auto block bg-white"
          role="img"
          :aria-label="`Trang PDF ${pageNumber} / ${pageCount}`"
        />
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  </section>
</template>
