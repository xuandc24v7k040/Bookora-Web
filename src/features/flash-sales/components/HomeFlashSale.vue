<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { ArrowRight, ChevronLeft, ChevronRight, Zap } from "@lucide/vue";
import type { StorefrontFlashSalesListParams } from "@/api/generated/models";
import { useResizeObserver } from "@vueuse/core";
import { Button } from "@/components/ui/button";
import { useFlashSales } from "../api/flash-sale-api";
import FlashCountdown from "./FlashCountdown.vue";
import FlashSaleCard from "./FlashSaleCard.vue";
const query = useFlashSales(
  ref<StorefrontFlashSalesListParams>({
    status: "ACTIVE",
    limit: 1,
    sortBy: "endAt",
    sortOrder: "asc",
  }),
);
const sale = computed(() =>
  query.isError.value ? null : query.data.value?.items[0],
);
const scroller = ref<HTMLElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
function updateScrollControls() {
  const element = scroller.value;
  if (!element) return;
  canScrollLeft.value = element.scrollLeft > 4;
  canScrollRight.value =
    element.scrollLeft + element.clientWidth < element.scrollWidth - 4;
}
function scroll(direction: -1 | 1) {
  const element = scroller.value;
  if (!element) return;
  element.scrollBy({
    left: direction * Math.max(240, element.clientWidth * 0.82),
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}
function onWheel(event: WheelEvent) {
  const element = scroller.value;
  if (!element || event.ctrlKey || event.deltaX || !event.deltaY) return;
  const delta =
    event.deltaY *
    (event.deltaMode === 1
      ? 16
      : event.deltaMode === 2
        ? element.clientWidth
        : 1);
  const max = element.scrollWidth - element.clientWidth;
  if (
    max <= 0 ||
    (delta < 0 && element.scrollLeft <= 0) ||
    (delta > 0 && element.scrollLeft >= max - 1)
  )
    return;
  event.preventDefault();
  element.scrollBy({ left: delta, behavior: "auto" });
}
watch(sale, async () => {
  await nextTick();
  updateScrollControls();
});
onMounted(updateScrollControls);
useResizeObserver(scroller, updateScrollControls);
</script>
<template>
  <section
    v-if="sale?.items.length"
    class="flash-sale-surface min-w-0 rounded-xl border bg-background"
    aria-label="Flash Sale"
  >
    <div
      class="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-t-xl bg-gradient-to-r from-green-900 via-green-800 to-lime-700 px-5 py-3 text-white"
    >
      <h2 class="flex items-center gap-2 text-xl font-bold italic">
        <Zap class="size-6 fill-yellow-300 text-yellow-300" />Flash Sale
      </h2>
      <p class="hidden text-sm xl:block">
        Ưu đãi chớp nhoáng cho những đầu sách nổi bật hôm nay
      </p>
      <FlashCountdown
        labeled
        class="sm:ml-auto"
        :end-at="sale.endAt"
        :server-now="sale.serverNow"
        @expired="query.refetch()"
      /><RouterLink
        to="/flash-sale"
        class="flex items-center gap-1 text-sm font-medium hover:underline"
        >Xem tất cả <ArrowRight class="size-4"
      /></RouterLink>
    </div>
    <div class="relative min-w-0 px-3 sm:px-4">
      <Button
        v-if="canScrollLeft"
        type="button"
        variant="outline"
        size="icon"
        aria-label="Xem Flash Sale trước"
        class="absolute left-1 top-1/2 z-10 size-9 -translate-y-1/2 rounded-full bg-background shadow-sm"
        @click="scroll(-1)"
        ><ChevronLeft class="size-4"
      /></Button>
      <div
        ref="scroller"
        data-flash-scroller
        role="region"
        aria-roledescription="carousel"
        aria-label="Sản phẩm Flash Sale"
        tabindex="0"
        class="flash-scrollbar flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto px-1 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        @scroll.passive="updateScrollControls"
        @wheel="onWheel"
        @keydown.left.self.prevent="scroll(-1)"
        @keydown.right.self.prevent="scroll(1)"
      >
        <FlashSaleCard
          v-for="item in sale.items"
          :key="item.id"
          :item="item"
          compact
          class="w-[min(82vw,300px)] max-w-none shrink-0 snap-start sm:w-[300px] lg:w-[calc((100%_-_2.25rem)/4)] lg:min-w-[260px]"
        />
      </div>
      <Button
        v-if="canScrollRight"
        type="button"
        variant="outline"
        size="icon"
        aria-label="Xem Flash Sale tiếp theo"
        class="absolute right-1 top-1/2 z-10 size-9 -translate-y-1/2 rounded-full bg-background shadow-sm"
        @click="scroll(1)"
        ><ChevronRight class="size-4"
      /></Button>
    </div>
  </section>
</template>
<style scoped>
.flash-scrollbar {
  scrollbar-width: none;
}
.flash-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
