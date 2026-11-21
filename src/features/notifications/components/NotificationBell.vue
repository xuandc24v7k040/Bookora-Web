<script setup lang="ts">
import { Bell, Check, ArrowRight } from '@lucide/vue';
import { onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import type { NotificationItemDto } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotificationQueries, notificationTarget } from '../notifications-api';
import NotificationRow from './NotificationRow.vue';

const props = defineProps<{ operations?: boolean }>();
const state = useNotificationQueries({ page: 1, limit: 5 });
const router = useRouter();
const open = ref(false);
let openedByHover = false;
let preserveHoverClick = false;
let closeTimer: ReturnType<typeof setTimeout> | undefined;
function enter(event: PointerEvent) {
  if (closeTimer) clearTimeout(closeTimer);
  if (event.pointerType === 'mouse' && !open.value) { open.value = true; openedByHover = true; }
}
function triggerClick() {
  if (closeTimer) clearTimeout(closeTimer);
  openedByHover = false;
  queueMicrotask(() => { preserveHoverClick = false; });
}
function updateOpen(value: boolean) {
  if (!value && preserveHoverClick) return;
  open.value = value;
}
function leave(event: PointerEvent) {
  if (event.pointerType === 'mouse') closeTimer = setTimeout(() => { open.value = false; }, 220);
}
onBeforeUnmount(() => { if (closeTimer) clearTimeout(closeTimer); });
async function markAll() {
  try { await state.mark.mutateAsync(undefined); }
  catch { toast.error('Không thể đánh dấu đã đọc. Vui lòng thử lại.'); }
}
async function select(item: NotificationItemDto) {
  try {
    if (!item.readAt) await state.mark.mutateAsync(item.id);
    const target = notificationTarget(item, Boolean(props.operations));
    if (!target) { toast.info('Nội dung liên kết hiện không còn khả dụng.'); return; }
    open.value = false;
    await router.push(target);
  } catch { toast.error('Không thể mở thông báo. Vui lòng thử lại.'); }
}
function viewAll() {
  open.value = false;
  void router.push(props.operations ? '/branch-admin/notifications' : '/account/notifications');
}
</script>

<template>
  <Popover v-if="operations ? state.isOperations.value : state.isCustomer.value" :open="open" @update:open="updateOpen">
    <PopoverTrigger as-child>
      <Button variant="ghost" size="icon" class="relative size-11 shrink-0 cursor-pointer" :aria-label="`Thông báo, ${state.unread.value} chưa đọc`"
        @pointerenter="enter" @pointerleave="leave" @pointerdown="preserveHoverClick = openedByHover && open" @click="triggerClick">
        <Bell class="size-6" aria-hidden="true" />
        <span v-if="state.unread.value > 0" class="absolute right-0 top-0 grid min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold leading-5 text-white" :class="operations ? 'bg-primary' : 'bg-[var(--bookora-green)]'">{{ state.unread.value > 99 ? '99+' : state.unread.value }}</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" :side-offset="8" class="notification-theme z-[70] w-[min(440px,calc(100vw-24px))] rounded-2xl bg-background p-2 shadow-xl"
      :class="operations ? 'notification-admin' : 'notification-client'" @pointerenter="enter" @pointerleave="leave"
      @open-auto-focus="(event) => { if (openedByHover) event.preventDefault(); }">
      <div class="flex flex-wrap items-center justify-between gap-2 px-3 py-3">
        <h2 class="text-lg font-semibold">{{ operations ? 'Thông báo mới' : 'Thông báo' }}</h2>
        <Button variant="ghost" size="sm" class="notification-action h-auto cursor-pointer whitespace-normal px-1 text-xs"
          :disabled="!state.unread.value || state.mark.isPending.value" @click="markAll"><Check class="size-4" /> Đánh dấu tất cả đã đọc</Button>
      </div>
      <ScrollArea :class="state.items.value.length || state.list.isPending.value ? 'h-[min(470px,calc(100dvh-210px))]' : 'max-h-[min(470px,calc(100dvh-210px))]'">
        <div v-if="state.list.isPending.value" class="space-y-2 p-2" aria-label="Đang tải thông báo"><Skeleton v-for="n in 3" :key="n" class="h-24 w-full" /></div>
        <div v-else-if="state.list.isError.value" role="alert" class="p-5 text-center text-sm"><p>Không thể tải thông báo.</p><Button variant="outline" size="sm" class="mt-2 cursor-pointer" @click="state.retry()">Thử lại</Button></div>
        <div v-else-if="!state.items.value.length" class="p-8 text-center text-sm text-muted-foreground">Bạn chưa có thông báo mới.</div>
        <div v-else class="space-y-1"><NotificationRow v-for="item in state.items.value" :key="item.id" :item="item" compact @select="select" /></div>
      </ScrollArea>
      <Button variant="ghost" class="notification-footer mt-2 w-full cursor-pointer" @click="viewAll">{{ operations ? 'Xem tất cả thông báo' : 'Xem tất cả' }} <ArrowRight class="size-4" /></Button>
    </PopoverContent>
  </Popover>
</template>
