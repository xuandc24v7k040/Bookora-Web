<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";

const props = defineProps<{ productId: string; html: string }>();
const contentId = useId();
const root = ref<HTMLElement | null>(null);
const content = ref<HTMLElement | null>(null);
const expanded = ref(false);
const overflowing = ref(false);
let observer: ResizeObserver | undefined;

function measure(): void {
  if (!root.value || !content.value) return;
  const limit =
    Number.parseFloat(
      getComputedStyle(root.value).getPropertyValue("--description-height"),
    ) || 320;
  overflowing.value =
    content.value.offsetTop + content.value.scrollHeight > limit + 1;
}

async function toggle(): Promise<void> {
  const bounds = root.value?.getBoundingClientRect();
  const scrollTarget =
    expanded.value && bounds && bounds.top < 0
      ? Math.max(0, window.scrollY + bounds.top - 96)
      : null;
  expanded.value = !expanded.value;
  await nextTick();
  // Move to the description in the same update as collapse, before the next paint.
  if (scrollTarget !== null) {
    window.scrollTo({ top: scrollTarget, behavior: "instant" });
  }
}

watch([() => props.productId, () => props.html], async () => {
  expanded.value = false;
  await nextTick();
  measure();
});

onMounted(() => {
  measure();
  observer = new ResizeObserver(measure);
  if (root.value) observer.observe(root.value);
  if (content.value) observer.observe(content.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div
    ref="root"
    class="scroll-mt-24 [--description-height:320px] sm:[--description-height:384px]"
  >
    <div
      :id="contentId"
      class="relative overflow-hidden"
      :class="{ 'max-h-[var(--description-height)]': !expanded }"
    >
      <div
        ref="content"
        class="prose prose-sm mt-5 max-w-none leading-7"
        v-html="html"
      />
      <div
        v-if="overflowing && !expanded"
        aria-hidden="true"
        data-description-fade
        class="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent"
      />
    </div>
    <div v-if="overflowing" class="mt-4 flex justify-center">
      <button
        type="button"
        class="cursor-pointer border-0 bg-transparent p-0 text-sm font-medium text-[var(--bookora-green)] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--bookora-green)]"
        :aria-expanded="expanded"
        :aria-controls="contentId"
        @click="toggle"
      >
        {{ expanded ? "Rút gọn" : "Xem thêm" }}
      </button>
    </div>
  </div>
</template>
