<script setup lang="ts">
import "../flash-sale.css";
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import { BookOpen, CalendarClock, Clock, Flame, Zap } from "@lucide/vue";
import type { StorefrontFlashSalesListParams } from "@/api/generated/models";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useFlashSales } from "../api/flash-sale-api";
import FlashCountdown from "../components/FlashCountdown.vue";
import FlashSaleCard from "../components/FlashSaleCard.vue";
const tab = ref("ACTIVE");
const page = ref(1);
const active = useFlashSales(
  computed<StorefrontFlashSalesListParams>(() => ({
    status: "ACTIVE",
    page: 1,
    limit: 10,
    sortBy: "endAt",
    sortOrder: "asc",
  })),
);
// Same key as `active` on page 1: Vue Query deduplicates the request.
// Keep the hero bound to the earliest deadline even while browsing later pages.
const activeListing = useFlashSales(
  computed<StorefrontFlashSalesListParams>(() => ({
    status: "ACTIVE",
    page: tab.value === "ACTIVE" ? page.value : 1,
    limit: 10,
    sortBy: "endAt",
    sortOrder: "asc",
  })),
);
const upcoming = useFlashSales(
  computed<StorefrontFlashSalesListParams>(() => ({
    status: "SCHEDULED",
    page: tab.value === "SCHEDULED" ? page.value : 1,
    limit: 10,
    sortBy: "startAt",
    sortOrder: "asc",
  })),
);
const query = computed(() =>
  tab.value === "ACTIVE" ? activeListing : upcoming,
);
const first = computed(() => active.data.value?.items[0]);
const direction = ref("flash-forward");
function changeTab(value: string | number) {
  const next = String(value);
  direction.value = next === "SCHEDULED" ? "flash-forward" : "flash-back";
  tab.value = next;
  page.value = 1;
}
const deadline = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(new Date(value))
    .replace(/^lúc\s*/, "");
function refresh() {
  void active.refetch();
  if (tab.value === "ACTIVE" && page.value > 1) void activeListing.refetch();
  void upcoming.refetch();
}
</script>
<template>
  <div class="flash-sale-surface w-full min-w-0 space-y-6">
    <nav
      class="flex items-center gap-2 text-sm text-muted-foreground"
      aria-label="Breadcrumb"
    >
      <RouterLink to="/">Trang chủ</RouterLink><span>/</span
      ><span class="text-foreground">Flash Sale</span>
    </nav>
    <section
      class="relative grid min-h-60 min-w-0 w-full grid-cols-[minmax(0,1fr)] items-center md:grid-cols-[minmax(0,1fr)_auto] gap-6 overflow-hidden rounded-2xl bg-gradient-to-r from-green-900 via-green-600 to-lime-300 p-4 text-white sm:p-6 lg:p-10"
    >
      <div class="relative z-10 min-w-0 space-y-3">
        <span
          class="inline-flex items-center gap-2 rounded-full bg-lime-100 px-4 py-1.5 text-sm font-bold text-green-900"
          ><Zap class="size-4 fill-current" />Sự kiện nổi bật</span
        >
        <h1 class="text-3xl font-black italic tracking-tight md:text-5xl">
          FLASH SALE <span class="text-lime-100">GIÁ SỐC</span>
        </h1>
        <p class="max-w-xl text-sm md:text-base">
          Săn deal sách hay mỗi ngày với mức giá hấp dẫn và số lượng ưu đãi có
          hạn.
        </p>
      </div>
      <BookOpen
        class="absolute left-[55%] top-4 hidden size-48 -rotate-12 text-lime-100/30 xl:block"
        aria-hidden="true"
      />
      <div
        v-if="tab === 'ACTIVE' && first"
        class="relative min-h-32 w-fit min-w-0 max-w-full rounded-2xl border border-white/50 bg-white/20 p-3 sm:p-5 text-green-950 backdrop-blur-sm"
      >
        <p class="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Clock class="size-5 shrink-0" /><span class="min-w-0"
            >ƯU ĐÃI KẾT THÚC SAU</span
          >
        </p>
        <FlashCountdown
          labeled
          class="text-xl sm:text-2xl"
          :end-at="first.endAt"
          :server-now="first.serverNow"
          @expired="refresh"
        />
      </div>
      <div
        v-else
        class="relative flex min-h-32 w-full max-w-60 items-center justify-center"
        aria-hidden="true"
      >
        <BookOpen class="size-28 text-lime-100/80" />
      </div>
    </section>
    <Tabs :model-value="tab" @update:model-value="changeTab">
      <TabsList
        class="relative grid h-auto w-full max-w-md grid-cols-2 gap-0 rounded-none border-b bg-transparent p-0"
      >
        <span
          aria-hidden="true"
          class="absolute bottom-0 left-0 h-0.5 w-1/2 bg-primary transition-transform duration-200 motion-reduce:transition-none"
          :class="tab === 'SCHEDULED' ? 'translate-x-full' : ''"
        />
        <TabsTrigger
          id="flash-tab-ACTIVE"
          aria-controls="flash-panel-ACTIVE"
          value="ACTIVE"
          class="grid grid-cols-[auto_auto] min-[400px]:flex flex-wrap gap-x-1 gap-y-1 rounded-none border-0 bg-transparent px-1 py-3 text-sm min-[400px]:text-base font-bold shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          ><Flame class="size-4 shrink-0 min-[400px]:size-5 fill-current" />Đang
          diễn ra
          <span
            class="col-span-2 justify-self-center rounded-full bg-primary/10 px-2 text-xs text-primary"
            >{{ active.data.value?.totalItems ?? 0 }}</span
          ></TabsTrigger
        >
        <TabsTrigger
          id="flash-tab-SCHEDULED"
          aria-controls="flash-panel-SCHEDULED"
          value="SCHEDULED"
          class="grid grid-cols-[auto_auto] min-[400px]:flex flex-wrap gap-x-1 gap-y-1 rounded-none border-0 bg-transparent px-1 py-3 text-sm min-[400px]:text-base font-bold shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          ><Clock class="size-4 shrink-0 min-[400px]:size-5" />Sắp diễn ra
          <span
            class="col-span-2 justify-self-center rounded-full bg-primary/10 px-2 text-xs text-primary"
            >{{ upcoming.data.value?.totalItems ?? 0 }}</span
          ></TabsTrigger
        >
      </TabsList>
      <div class="min-h-80 min-w-0 overflow-hidden pt-6">
        <Transition :name="direction" mode="out-in">
          <div
            :key="tab"
            :id="`flash-panel-${tab}`"
            role="tabpanel"
            :aria-labelledby="`flash-tab-${tab}`"
            tabindex="0"
            class="min-w-0 space-y-6"
          >
            <div
              v-if="query.isPending.value"
              class="grid grid-cols-2 gap-4 lg:grid-cols-5"
            >
              <Skeleton v-for="n in 5" :key="n" class="h-96" />
            </div>
            <div
              v-else-if="query.isError.value"
              class="rounded-xl border p-10 text-center"
            >
              <p>Không thể tải Flash Sale.</p>
              <Button class="mt-3" variant="outline" @click="refresh"
                >Thử lại</Button
              >
            </div>
            <template v-else
              ><section
                v-for="sale in query.data.value?.items"
                :key="sale.id"
                class="space-y-4"
              >
                <header
                  class="flex flex-wrap items-center justify-between gap-3"
                >
                  <h2 class="flex min-w-0 items-center gap-2 text-xl font-bold">
                    <Zap
                      class="size-8 shrink-0 rounded-lg bg-lime-100 p-1.5 text-green-800"
                    />{{ sale.name }}
                  </h2>
                  <p class="text-sm font-semibold text-primary">
                    {{ tab === "ACTIVE" ? "Kết thúc lúc" : "Bắt đầu lúc" }}:
                    {{ deadline(tab === "ACTIVE" ? sale.endAt : sale.startAt) }}
                  </p>
                </header>
                <p
                  v-if="sale.description"
                  class="text-sm text-muted-foreground"
                >
                  {{ sale.description }}
                </p>
                <div
                  class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,130px),1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:gap-4"
                >
                  <FlashSaleCard
                    v-for="item in sale.items"
                    :key="item.id"
                    :item="item"
                    :upcoming="tab === 'SCHEDULED'"
                  />
                </div>
              </section>
              <div
                v-if="!query.data.value?.items.length"
                class="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center"
              >
                <CalendarClock class="mb-4 size-16 text-primary/50" />
                <h2 class="text-xl font-semibold">
                  Chưa có chương trình Flash Sale
                  {{ tab === "ACTIVE" ? "đang diễn ra" : "sắp diễn ra" }}
                </h2>
                <p class="mt-2 max-w-md text-sm text-muted-foreground">
                  Những ưu đãi sách mới sẽ sớm được cập nhật. Hãy quay lại để
                  khám phá nhé.
                </p>
                <Button
                  v-if="tab === 'SCHEDULED' && active.data.value?.totalItems"
                  class="mt-5"
                  variant="outline"
                  @click="changeTab('ACTIVE')"
                  >Xem ưu đãi đang diễn ra</Button
                >
              </div>
              <div
                v-if="(query.data.value?.totalPages ?? 0) > 1"
                class="flex items-center justify-center gap-3"
              >
                <Button variant="outline" :disabled="page <= 1" @click="page--"
                  >Trước</Button
                ><span>Trang {{ page }}</span
                ><Button
                  variant="outline"
                  :disabled="page >= (query.data.value?.totalPages ?? 1)"
                  @click="page++"
                  >Sau</Button
                >
              </div></template
            >
          </div></Transition
        >
      </div>
    </Tabs>
  </div>
</template>
<style scoped>
.flash-forward-enter-active,
.flash-forward-leave-active,
.flash-back-enter-active,
.flash-back-leave-active {
  transition:
    transform 220ms ease,
    opacity 220ms ease;
}
.flash-forward-enter-from,
.flash-back-leave-to {
  transform: translateX(24px);
  opacity: 0;
}
.flash-back-enter-from,
.flash-forward-leave-to {
  transform: translateX(-24px);
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .flash-forward-enter-active,
  .flash-forward-leave-active,
  .flash-back-enter-active,
  .flash-back-leave-active {
    transition: none;
  }
}
</style>
