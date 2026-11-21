<script setup lang="ts">
import { ArrowRight, Copy } from '@lucide/vue';
import { toast } from 'vue-sonner';
import type { NotificationItemDto } from '@/api/generated/models';
import { notificationIcon, notificationTime } from '../notification-presentation';
defineProps<{ item: NotificationItemDto; compact?: boolean }>();
defineEmits<{ select: [item: NotificationItemDto] }>();
async function copyCode(code: string) {
  try { await navigator.clipboard.writeText(code); toast.success('Đã sao chép mã giảm giá.'); }
  catch { toast.error('Không thể sao chép mã. Bạn có thể chọn và sao chép từ tiêu đề.'); }
}
</script>

<template>
  <div class="relative rounded-xl">
  <button type="button" class="notification-row flex w-full cursor-pointer items-start gap-3 rounded-xl px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
    :class="item.readAt ? 'bg-background hover:bg-muted/50' : 'notification-unread'" @click="$emit('select', item)">
    <span class="notification-icon grid size-10 shrink-0 place-items-center rounded-xl"><component :is="notificationIcon(item.type)" class="size-5" aria-hidden="true" /></span>
    <span class="min-w-0 flex-1">
      <span class="block break-words text-sm font-semibold leading-5 [overflow-wrap:anywhere]">{{ item.title }}</span>
      <span class="mt-0.5 block text-xs leading-5 text-muted-foreground" :class="compact ? 'line-clamp-2' : ''">{{ item.content }}</span>
      <span class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground" :class="item.couponCode ? 'pr-28' : ''">
        <span v-if="!compact" class="notification-category rounded-full px-2 py-0.5 font-medium">{{ item.category === 'PROMOTION' ? 'Khuyến mãi' : 'Đơn hàng' }}</span>
        <time :datetime="item.createdAt" :title="new Date(item.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })">{{ notificationTime(item.createdAt) }}</time>
      </span>
      <span v-if="!compact" class="notification-action mt-1 flex items-center gap-1 text-xs font-semibold sm:hidden">Xem chi tiết <ArrowRight class="size-3" /></span>
    </span>
    <span class="flex shrink-0 flex-col items-end gap-3">
      <span v-if="!item.readAt" class="notification-dot mt-1 size-2 rounded-full" aria-label="Chưa đọc" />
      <span v-if="!compact" class="notification-action hidden items-center gap-1 text-xs font-semibold sm:flex">Xem chi tiết <ArrowRight class="size-4" /></span>
    </span>
  </button>
  <button v-if="item.couponCode" type="button" class="notification-action absolute bottom-3 right-4 flex cursor-pointer items-center gap-1 rounded px-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2" :aria-label="`Sao chép mã ${item.couponCode}`" @click="copyCode(item.couponCode)"><Copy class="size-3" /> Sao chép mã</button>
  </div>
</template>
