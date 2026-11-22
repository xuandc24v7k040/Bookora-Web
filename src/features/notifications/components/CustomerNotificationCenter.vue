<script setup lang="ts">
import { Check, ChevronLeft, ChevronRight, Search } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import type { NotificationItemDto, NotificationsListParams } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { notificationGroup } from '../notification-presentation';
import { useNotificationQueries, notificationTarget } from '../notifications-api';
import NotificationRow from './NotificationRow.vue';

const router = useRouter();
const tab = ref('all'), search = ref(''), settledSearch = ref('');
const sort = ref<'newest' | 'oldest'>('newest');
const page = ref(1);
const params = computed<NotificationsListParams>(() => ({ page: page.value, limit: 6,
  search: settledSearch.value || undefined, sort: sort.value,
  unreadOnly: tab.value === 'unread' || undefined,
  category: tab.value === 'order' ? 'ORDER' : tab.value === 'promotion' ? 'PROMOTION' : undefined,
}));
const state = useNotificationQueries(params);
const settleSearch = useDebounceFn((value: string) => { settledSearch.value = value.trim(); }, 300);
watch(search, (value) => { void settleSearch(value); });
watch([tab, settledSearch, sort], () => { page.value = 1; });
const groups = computed(() => {
  const map = new Map<string, NotificationItemDto[]>();
  for (const item of state.items.value) {
    const label = notificationGroup(item.createdAt);
    map.set(label, [...(map.get(label) ?? []), item]);
  }
  return [...map].map(([label, items]) => ({ label, items }));
});
watch(() => state.list.data.value?.totalPages, (total) => { if (total && page.value > total) page.value = total; });
async function markAll() {
  try { await state.mark.mutateAsync(undefined); }
  catch { toast.error('Không thể đánh dấu đã đọc. Vui lòng thử lại.'); }
}
async function select(item: NotificationItemDto) {
  try {
    if (!item.readAt) await state.mark.mutateAsync(item.id);
    const target = notificationTarget(item, false);
    if (target) await router.push(target);
    else toast.info('Nội dung liên kết hiện không còn khả dụng.');
  } catch { toast.error('Không thể mở thông báo. Vui lòng thử lại.'); }
}
</script>

<template>
  <section class="notification-theme notification-client min-w-0 rounded-2xl border bg-background p-4 sm:p-6">
    <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Thông báo</h1>
    <p class="mt-1 text-sm text-muted-foreground">Theo dõi cập nhật đơn hàng và ưu đãi dành cho bạn tại Bookora.</p>
    <div class="my-5 flex flex-wrap items-center gap-3">
      <Tabs v-model="tab" class="w-full min-w-0 max-w-full sm:w-auto"><TabsList class="h-auto w-full flex-wrap gap-1 rounded-none">
        <TabsTrigger v-for="option in [{ value: 'all', label: 'Tất cả' }, { value: 'unread', label: 'Chưa đọc' }, { value: 'order', label: 'Đơn hàng' }, { value: 'promotion', label: 'Khuyến mãi' }]"
          :key="option.value" :value="option.value" class="shrink-0 flex-none cursor-pointer rounded-none data-[state=active]:rounded-[4px]" :class="tab === option.value ? 'notification-active' : ''">{{ option.label }}</TabsTrigger>
      </TabsList></Tabs>
      <div class="relative min-w-0 flex-1 basis-60"><Search class="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><Input v-model="search" aria-label="Tìm thông báo" placeholder="Tìm theo tiêu đề hoặc nội dung thông báo" class="h-10 pl-9" /></div>
      <Button variant="outline" class="notification-action h-10 max-w-full cursor-pointer whitespace-normal" :disabled="!state.unread.value || state.mark.isPending.value" @click="markAll"><Check class="size-4" /> Đánh dấu tất cả đã đọc</Button>
      <Select v-model="sort"><SelectTrigger aria-label="Sắp xếp thông báo" class="h-10 w-32 cursor-pointer"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest" class="cursor-pointer">Mới nhất</SelectItem><SelectItem value="oldest" class="cursor-pointer">Cũ nhất</SelectItem></SelectContent></Select>
    </div>
    <div v-if="state.list.isPending.value" class="space-y-3" aria-label="Đang tải thông báo"><Skeleton v-for="n in 6" :key="n" class="h-24 w-full rounded-xl" /></div>
    <div v-else-if="state.list.isError.value" role="alert" class="py-12 text-center"><p>Không thể tải thông báo.</p><Button variant="outline" class="mt-3 cursor-pointer" @click="state.retry()">Thử lại</Button></div>
    <div v-else-if="!state.items.value.length" class="py-14 text-center text-sm text-muted-foreground">{{ tab === 'unread' ? 'Bạn đã đọc tất cả thông báo.' : search ? 'Không tìm thấy thông báo phù hợp.' : 'Bạn chưa có thông báo.' }}</div>
    <div v-else class="space-y-4"><div v-for="group in groups" :key="group.label"><h2 class="mb-2 text-xs font-semibold text-muted-foreground">{{ group.label }}</h2><div class="space-y-2"><NotificationRow v-for="item in group.items" :key="item.id" :item="item" class="border" @select="select" /></div></div></div>
    <div v-if="state.list.data.value && !state.list.isError.value" class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
      <p class="text-muted-foreground">Hiển thị {{ state.items.value.length }}/{{ state.list.data.value.totalItems }} thông báo</p>
      <nav class="flex items-center gap-2" aria-label="Phân trang thông báo"><Button variant="outline" size="sm" class="cursor-pointer" :disabled="page <= 1 || state.list.isFetching.value" @click="page--"><ChevronLeft class="size-4" /> Trước</Button><span aria-live="polite">{{ page }} / {{ state.list.data.value.totalPages }}</span><Button variant="outline" size="sm" class="cursor-pointer" :disabled="page >= state.list.data.value.totalPages || state.list.isFetching.value" @click="page++">Sau <ChevronRight class="size-4" /></Button></nav>
    </div>
  </section>
</template>
