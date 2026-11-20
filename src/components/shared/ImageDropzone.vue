<script setup lang="ts">
import { Camera, ImagePlus, Trash2, UploadCloud } from "@lucide/vue";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { Button } from "@/components/ui/button";

const props = withDefaults(
  defineProps<{
    modelValue: File | null;
    currentUrl?: string | null;
    disabled?: boolean;
    imageAlt?: string;
    multiple?: boolean;
    maxFiles?: number;
    compact?: boolean;
  }>(),
  {
    currentUrl: null,
    disabled: false,
    imageAlt: "Ảnh đã chọn",
    multiple: false,
    maxFiles: 1,
    compact: false,
  },
);
const emit = defineEmits<{
  "update:modelValue": [file: File | null];
  remove: [];
  invalid: [message: string];
  valid: [];
  files: [files: File[]];
  validating: [value: boolean];
}>();
const input = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const isValidating = ref(false);
const previewUrl = ref<string | null>(null);
let active = true;
const shownUrl = computed(() => previewUrl.value ?? props.currentUrl);
const allowedTypes = new Map([
  ["image/jpeg", new Set(["jpg", "jpeg"])],
  ["image/png", new Set(["png"])],
  ["image/webp", new Set(["webp"])],
]);

function revoke(): void {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = null;
}
watch(
  () => props.modelValue,
  (file) => {
    revoke();
    if (file) previewUrl.value = URL.createObjectURL(file);
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  active = false;
  revoke();
});

function resetInput(): void {
  if (input.value) input.value.value = "";
}

function invalid(message: string): void {
  emit("invalid", message);
  resetInput();
}

async function canDecode(file: File): Promise<boolean> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const valid = bitmap.width > 0 && bitmap.height > 0;
      bitmap.close();
      return valid;
    } catch {
      return false;
    }
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(false);
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => resolve(false);
      image.onload = () =>
        resolve(image.naturalWidth > 0 && image.naturalHeight > 0);
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function accept(files: FileList | null): Promise<void> {
  if (!files?.length || props.disabled || isValidating.value) return;
  if (
    (!props.multiple && files.length !== 1) ||
    files.length > props.maxFiles
  ) {
    invalid(
      props.multiple
        ? `Chỉ được chọn thêm tối đa ${props.maxFiles} ảnh.`
        : "Chỉ được chọn một ảnh mỗi lần.",
    );
    return;
  }
  const selected = Array.from(files);
  for (const file of selected) {
    const extension = file.name.split(".").pop()?.toLocaleLowerCase("vi") ?? "";
    const extensions = allowedTypes.get(file.type);
    if (!extensions?.has(extension)) {
      invalid("Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.");
      return;
    }
    if (!file.size || file.size > 5 * 1024 * 1024) {
      invalid("Ảnh không được vượt quá 5 MB.");
      return;
    }
  }
  isValidating.value = true;
  emit("validating", true);
  try {
    for (const file of selected) {
      if (!(await canDecode(file))) {
        invalid("Không thể đọc ảnh đã chọn. Vui lòng chọn tệp ảnh khác.");
        return;
      }
    }
  } finally {
    isValidating.value = false;
    emit("validating", false);
  }
  if (!active || props.disabled) return;
  emit("valid");
  if (props.multiple) emit("files", selected);
  else emit("update:modelValue", selected[0]!);
  resetInput();
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-if="shownUrl"
      class="relative overflow-hidden rounded-lg border bg-muted/30"
    >
      <img
        :src="shownUrl"
        :alt="imageAlt"
        class="h-44 w-full object-cover"
      /><Button
        type="button"
        size="sm"
        variant="destructive"
        class="absolute right-2 top-2"
        :disabled="disabled || isValidating"
        @click="modelValue ? emit('update:modelValue', null) : emit('remove')"
        ><Trash2 class="mr-2 h-4 w-4" />Xóa ảnh</Button
      >
    </div>
    <button
      type="button"
      class="flex flex-col items-center justify-center rounded-lg border-dashed text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)] disabled:opacity-50"
      :class="[
        compact
          ? 'size-24 shrink-0 cursor-pointer border border-[var(--bookora-green)] text-[var(--bookora-green)] hover:bg-[var(--bookora-green)]/5 disabled:cursor-not-allowed sm:size-28'
          : 'w-full border-2 px-5 py-8 hover:bg-muted/40',
        isDragging
          ? 'border-primary bg-primary/5'
          : !compact && 'border-muted-foreground/25',
      ]"
      :disabled="disabled || isValidating"
      @click="input?.click()"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="
        isDragging = false;
        accept($event.dataTransfer?.files ?? null);
      "
    >
      <template v-if="compact"
        ><Camera class="mb-2 size-7" /><span class="text-sm font-medium"
          >Thêm ảnh</span
        ></template
      >
      <template v-else
        ><UploadCloud class="mb-3 h-8 w-8 text-muted-foreground" /><span
          class="font-medium"
          >Kéo thả ảnh hoặc bấm để chọn</span
        ><span class="mt-1 text-xs text-muted-foreground"
          >JPEG, PNG hoặc WebP · tối đa 5 MB</span
        ></template
      >
    </button>
    <input
      ref="input"
      type="file"
      class="sr-only"
      accept="image/jpeg,image/png,image/webp"
      :multiple="multiple"
      :disabled="disabled || isValidating"
      @change="accept(($event.target as HTMLInputElement).files)"
    />
    <p
      v-if="modelValue"
      class="flex items-center gap-2 truncate text-sm text-muted-foreground"
    >
      <ImagePlus class="h-4 w-4" />{{ modelValue.name }}
    </p>
  </div>
</template>
