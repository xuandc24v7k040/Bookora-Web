<script setup lang="ts">
import "../flash-sale.css";
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { Flame, Zap } from "@lucide/vue";
import type { FlashSaleItemDto } from "@/api/generated/models";
import { formatVnd } from "@/features/products/utils/product-money";
const props = defineProps<{
  item: FlashSaleItemDto;
  compact?: boolean;
  upcoming?: boolean;
}>();
const discounted = computed(
  () =>
    props.item.catalogPrice > props.item.flashPrice &&
    props.item.discountPercent > 0 &&
    (props.upcoming || props.item.remaining > 0),
);
// Consumed quota drives this visual; reservations remain a separate count.
const progress = computed(() => {
  const { totalQuota, consumed } = props.item;
  if (
    !Number.isFinite(totalQuota) ||
    totalQuota <= 0 ||
    !Number.isFinite(consumed)
  )
    return 0;
  return Math.max(0, Math.min(100, (consumed / totalQuota) * 100));
});
const heatLabel = computed(() => {
  if (props.item.remaining <= 0) return "Hết suất ưu đãi";
  if (!discounted.value || progress.value >= 100) return "";
  if (progress.value >= 90) return "Sắp cháy suất";
  return progress.value > 70 ? "Deal đang hot" : "";
});
</script>
<template>
  <RouterLink
    :to="{
      name: 'client-book-detail',
      params: { slug: item.productSlug },
      query: { variant: item.variantId },
    }"
    class="flash-sale-surface group relative flex h-full w-full min-w-0 flex-col rounded-xl border border-[var(--bookora-border)] bg-background p-3 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[var(--bookora-green)]/50 hover:shadow-md focus-within:border-[var(--bookora-green)]/60 focus-within:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none motion-reduce:transition-none"
    :class="compact ? 'max-w-80 gap-3 pt-8' : 'gap-3 pt-9'"
  >
    <span
      v-if="discounted"
      class="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary"
      ><Zap class="size-3 fill-current" aria-hidden="true" />-{{
        item.discountPercent
      }}%</span
    >
    <div
      :class="
        compact
          ? 'flex min-w-0 flex-row gap-3'
          : 'flex min-w-0 flex-1 flex-col gap-3'
      "
    >
      <div
        class="flex shrink-0 items-center justify-center rounded-lg bg-stone-50 p-2"
        :class="compact ? 'h-28 w-20' : 'aspect-[3/4] w-full'"
      >
        <img
          v-if="item.imageUrl"
          :src="item.imageUrl"
          :alt="item.productName"
          class="h-full max-w-full object-contain"
          loading="lazy"
        /><Zap v-else class="size-10 text-green-700" />
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <h3
          class="line-clamp-2 font-semibold leading-snug text-sm transition-colors group-hover:text-primary group-focus-within:text-primary"
        >
          {{ item.productName }}
        </h3>
        <p class="line-clamp-2 text-xs text-muted-foreground">
          {{ item.variantLabel }}
        </p>
        <div
          :class="[
            'flex flex-wrap items-baseline gap-x-2 pt-2',
            compact ? '' : 'mt-auto',
          ]"
        >
          <strong
            class="text-green-800"
            :class="compact ? 'text-sm' : 'text-lg'"
            >{{
              formatVnd(
                discounted && (upcoming || item.remaining > 0)
                  ? item.flashPrice
                  : item.catalogPrice,
              )
            }}</strong
          ><del
            v-if="discounted && (upcoming || item.remaining > 0)"
            class="text-xs text-muted-foreground"
            >{{ formatVnd(item.catalogPrice) }}</del
          >
        </div>
      </div>
    </div>
    <template v-if="!upcoming"
      ><div class="space-y-1">
        <p
          class="min-h-4 text-[11px] font-semibold text-primary"
          data-flash-heat
        >
          {{ heatLabel }}
        </p>
        <div class="relative h-2.5">
          <div
            class="h-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            :aria-valuenow="progress"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label="Tỷ lệ suất Flash Sale đã dùng"
          >
            <div
              class="h-full rounded-full bg-gradient-to-r from-green-900 to-green-600 transition-[width] duration-200 motion-reduce:transition-none"
              :style="{ width: `${progress}%` }"
            />
          </div>
          <Flame
            data-flash-flame
            aria-hidden="true"
            class="pointer-events-none absolute left-[clamp(7px,var(--flash-progress),calc(100%_-_7px))] top-[calc(50%_-_2px)] size-5 -translate-x-1/2 -translate-y-1/2 fill-current text-primary transition-[left,filter,transform] duration-200 motion-reduce:transition-none"
            :class="
              progress >= 90
                ? 'drop-shadow-[0_0_3px_color-mix(in_oklab,var(--color-primary)_30%,transparent)]'
                : progress > 70
                  ? 'drop-shadow-[0_0_2px_color-mix(in_oklab,var(--color-primary)_20%,transparent)]'
                  : ''
            "
            :style="{ '--flash-progress': `${progress}%` }"
          />
        </div>
      </div>
      <div
        class="flex flex-wrap justify-between gap-1 text-[11px] text-muted-foreground"
      >
        <span>Đã dùng {{ item.consumed }} · Giữ {{ item.reserved }}</span
        ><span>{{
          item.remaining > 0
            ? `Còn ${item.remaining} suất`
            : "Hết suất · Giá thường"
        }}</span>
      </div></template
    >
    <p v-else class="text-xs text-green-800">Giá ưu đãi áp dụng khi bắt đầu</p>
  </RouterLink>
</template>
