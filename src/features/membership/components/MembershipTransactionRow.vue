<script setup lang="ts">
import { Package } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import type { MembershipTransactionDto } from '@/api/generated/models'
import { formatVnd } from '@/features/products/utils/product-money'
import { membershipDate } from '../membership-ui'
defineProps<{ transaction: MembershipTransactionDto; admin?: boolean }>()
</script>
<template>
  <div
    class="flex min-w-0 flex-wrap items-center gap-3 border-b py-3 last:border-0"
  >
    <div
      class="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--bookora-soft)] text-[var(--bookora-green)]"
    >
      <Package class="size-5" />
    </div>
    <div class="min-w-0 flex-1 basis-24">
      <p
        v-if="admin"
        class="truncate text-sm font-semibold"
        :title="transaction.orderCode"
      >
        Đơn #{{ transaction.orderCode }}
      </p>
      <RouterLink
        v-else
        :to="`/account/orders/${transaction.orderId}`"
        class="block cursor-pointer truncate rounded text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
        :title="transaction.orderCode"
        >Đơn #{{ transaction.orderCode }}</RouterLink
      >
      <p class="mt-1 text-xs text-muted-foreground">
        {{ membershipDate(transaction.effectiveAt) }}
      </p>
    </div>
    <p
      class="max-w-full break-words text-right text-sm font-bold tabular-nums text-[var(--bookora-green)]"
    >
      +{{ formatVnd(transaction.amount) }}
    </p>
  </div>
</template>
