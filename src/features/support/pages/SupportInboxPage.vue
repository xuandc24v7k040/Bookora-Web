<script setup lang="ts">
import { ref, watch } from "vue";
import { MessageCircle, RefreshCw, WifiOff } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSupportStore } from "../state/support.store";
import SupportTicketList from "../components/SupportTicketList.vue";
import SupportThread from "../components/SupportThread.vue";
import SupportContext from "../components/SupportContext.vue";
const store = useSupportStore();
const showThread = ref(false),
  contextOpen = ref(false);
watch(
  () => store.scope.key,
  () => {
    showThread.value = false;
    contextOpen.value = false;
  },
);
</script>
<template>
  <div class="support-admin min-w-0">
    <div
      class="support-page-heading mb-4 flex flex-wrap items-start justify-between gap-3"
    >
      <div>
        <p class="mb-2 text-xs text-muted-foreground">
          Chăm sóc khách hàng <span class="mx-2">›</span> Tin nhắn khách hàng
        </p>
        <h1 class="text-xl font-bold tracking-tight sm:text-2xl">
          Tin nhắn khách hàng
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Tiếp nhận, phản hồi và theo dõi hỗ trợ tại chi nhánh của bạn.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        class="cursor-pointer"
        @click="store.reconcile()"
        ><RefreshCw class="size-4" />Làm mới</Button
      >
    </div>
    <p v-if="!store.canUse" role="alert" class="rounded-xl border p-6 text-sm">
      Bạn không có quyền xem hỗ trợ ở chi nhánh hiện tại.
    </p>
    <template v-else
      ><p
        v-if="store.status !== 'connected'"
        role="status"
        class="mb-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900"
      >
        <WifiOff class="size-4" />Đang kết nối lại. Hội thoại sẽ tự đồng bộ khi
        có kết nối.
      </p>
      <div
        class="support-inbox grid min-h-0 min-w-0 overflow-hidden border-y bg-background"
        :class="{ 'support-inbox-thread': showThread }"
      >
        <div class="support-admin-list min-h-0 min-w-0 border-r">
          <SupportTicketList @select="showThread = true" />
        </div>
        <div class="support-admin-thread min-h-0 min-w-0">
          <SupportThread
            v-if="store.activeId"
            :key="store.scope.key"
            :visible="true"
            @back="
              showThread = false;
              store.stopTyping();
            "
            @context="contextOpen = true"
          />
          <div
            v-else
            class="flex h-full flex-col items-center justify-center gap-3 p-6 text-center"
          >
            <MessageCircle class="size-12 text-muted-foreground/25" />
            <h2 class="font-semibold">Hỗ trợ bắt đầu từ lắng nghe</h2>
            <p class="max-w-64 text-sm leading-6 text-muted-foreground">
              Chọn một hội thoại để xem nội dung và tiếp nhận yêu cầu của khách
              hàng.
            </p>
            <p v-if="store.error" class="text-xs text-red-700" role="alert">
              {{ store.error }}
            </p>
          </div>
        </div>
        <aside class="support-admin-context min-h-0 min-w-0 border-l">
          <SupportContext v-if="store.activeId" />
          <div v-else class="p-4 text-xs text-muted-foreground">
            Thông tin hỗ trợ xuất hiện khi bạn chọn hội thoại.
          </div>
        </aside>
      </div>
    </template>
    <Sheet v-model:open="contextOpen"
      ><SheetContent class="w-[min(23rem,calc(100vw-1rem))] gap-0 p-0"
        ><SheetHeader class="shrink-0 p-4"
          ><SheetTitle>Thông tin hỗ trợ</SheetTitle
          ><SheetDescription
            >Thông tin hiển thị theo quyền tại chi nhánh.</SheetDescription
          ></SheetHeader
        ><SupportContext v-if="store.activeId && contextOpen" /></SheetContent
    ></Sheet>
  </div>
</template>
