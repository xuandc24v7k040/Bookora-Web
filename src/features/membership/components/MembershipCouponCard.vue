<script setup lang="ts">
import { BookOpen, Copy } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { MembershipCouponDto } from '@/api/generated/models'
import { Button } from '@/components/ui/button'
import { couponBenefit } from '@/features/coupons/coupon-utils'
import { formatVnd } from '@/features/products/utils/product-money'
import MembershipTierBadge from './MembershipTierBadge.vue'
import { membershipDate } from '../membership-ui'
defineProps<{ coupon: MembershipCouponDto }>()
async function copy(code: string) {
  try {
    await navigator.clipboard.writeText(code)
    toast.success('Đã sao chép mã giảm giá.')
  } catch {
    toast.error('Không thể sao chép. Vui lòng thử lại.')
  }
}
</script>
<template>
  <article class="flex min-w-0 items-center gap-3 rounded-xl border p-3">
    <div
      class="hidden w-16 shrink-0 flex-col items-center gap-1 border-r pr-3 text-[var(--bookora-green)] sm:flex"
    >
      <BookOpen class="size-6" aria-hidden="true" /><span
        class="text-xs font-bold"
        >Bookora</span
      >
    </div>
    <div class="min-w-0 flex-1 space-y-1">
      <p class="text-sm font-semibold leading-5" :title="coupon.name">
        {{ couponBenefit(coupon) }}
      </p>
      <p class="text-xs text-[var(--bookora-muted)]">
        Đơn từ {{ formatVnd(coupon.minOrderAmount) }} · Hết hạn
        {{ membershipDate(coupon.endAt) }}
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          class="h-7 max-w-full cursor-pointer rounded-full px-2 text-xs"
          :title="coupon.code"
          :aria-label="`Sao chép mã ${coupon.code}`"
          @click="copy(coupon.code)"
          ><span class="min-w-0 truncate">{{ coupon.code }}</span
          ><Copy class="size-3 shrink-0"
        /></Button>
        <MembershipTierBadge :tier="coupon.minimumMembershipTier" minimum />
      </div>
    </div>
  </article>
</template>
