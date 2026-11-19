<script setup lang="ts">
import { Zap } from "@lucide/vue";
import type { FlashSaleOfferDto } from "@/api/generated/models";
import { formatVnd } from "@/features/products/utils/product-money";
import FlashCountdown from "./FlashCountdown.vue";
defineProps<{ offer: FlashSaleOfferDto }>();
const emit = defineEmits<{ expired: [] }>();
</script>
<template>
  <div class="mt-5 overflow-hidden rounded-xl border border-green-600">
    <header
      class="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-green-900 via-green-700 to-lime-500 p-3 text-white"
    >
      <strong class="flex items-center gap-2 text-lg"
        ><Zap class="size-6 fill-current" />FLASH SALE</strong
      >
      <div class="flex items-center gap-2 text-sm">
        <span>Kết thúc trong</span
        ><FlashCountdown
          :end-at="offer.endAt"
          :server-now="offer.serverNow"
          @expired="emit('expired')"
        />
      </div>
    </header>
    <div class="space-y-3 bg-gradient-to-br from-green-50 to-white p-4">
      <div class="flex flex-wrap items-baseline gap-3">
        <strong class="text-3xl font-bold text-green-900">{{
          formatVnd(offer.flashPrice)
        }}</strong
        ><del class="text-muted-foreground">{{
          formatVnd(offer.catalogPrice)
        }}</del
        ><span
          class="inline-flex items-center gap-1 rounded-full bg-green-700 px-2 py-1 text-xs font-bold text-white"
          ><Zap class="size-3 fill-current" />-{{
            offer.discountPercent
          }}%</span
        >
      </div>
      <div class="flex flex-wrap justify-between gap-2 text-xs">
        <strong class="text-green-900"
          >Còn {{ offer.remaining }} suất ưu đãi</strong
        ><span class="text-muted-foreground"
          >Giới hạn {{ offer.maxQuantityPerUser }} cuốn/khách · Bạn còn
          {{ offer.userRemaining }} suất</span
        >
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-green-100">
        <div
          class="h-full rounded-full bg-gradient-to-r from-green-900 to-green-500"
          :style="{
            width: `${Math.min(100, ((offer.totalQuota - offer.remaining) / offer.totalQuota) * 100)}%`,
          }"
        />
      </div>
    </div>
  </div>
</template>
