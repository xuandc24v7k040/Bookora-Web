<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, ChevronRight, History, Layers, Ticket } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatVnd } from '@/features/products/utils/product-money'
import {
  useMembership,
  useMembershipCoupons,
  useMembershipTransactions,
} from '../use-membership'
import {
  membershipDate,
  tierAccents,
  tierIcons,
  tierLabels,
} from '../membership-ui'
import MembershipCouponCard from '../components/MembershipCouponCard.vue'
import MembershipTransactionRow from '../components/MembershipTransactionRow.vue'
import MembershipListDialog from '../components/MembershipListDialog.vue'
import '../membership.css'

const membership = useMembership(),
  coupons = useMembershipCoupons(1, 3),
  transactions = useMembershipTransactions(1, 3)
const summary = computed(() => membership.data.value)
const dialog = ref<'coupons' | 'transactions' | null>(null)
const sections = [
  {
    kind: 'coupons' as const,
    title: 'Ưu đãi của bạn',
    description: 'Coupon thành viên bạn đủ hạng để sử dụng',
    icon: Ticket,
    query: coupons,
    action: 'Xem tất cả ưu đãi',
  },
  {
    kind: 'transactions' as const,
    title: 'Lịch sử tích lũy',
    description: 'Theo các đơn đã hoàn thành và thanh toán',
    icon: History,
    query: transactions,
    action: 'Xem toàn bộ lịch sử',
  },
]
</script>
<template>
  <section class="membership-client min-w-0 space-y-5">
    <header>
      <h1 class="text-2xl font-bold tracking-tight lg:text-3xl">
        Hạng thành viên
      </h1>
      <p class="mt-1 text-sm leading-6 text-[var(--bookora-muted)]">
        Theo dõi hạng thành viên, tiến độ chi tiêu và các quyền lợi dành riêng
        cho bạn tại Bookora.
      </p>
    </header>
    <Skeleton
      v-if="membership.isPending.value"
      class="h-52 w-full rounded-xl"
    />
    <div
      v-else-if="membership.isError.value"
      role="alert"
      class="rounded-xl border p-6"
    >
      <p class="mb-3">Không thể tải hạng thành viên.</p>
      <Button
        variant="outline"
        class="cursor-pointer"
        @click="membership.refetch()"
        >Thử lại</Button
      >
    </div>
    <template v-else-if="summary">
      <article
        class="membership-hero relative overflow-hidden rounded-xl border border-[var(--bookora-border)] p-5 lg:p-6"
      >
        <p
          class="mb-5 inline-flex rounded-full bg-[var(--bookora-soft)] px-3 py-1 text-xs font-bold text-[var(--bookora-green)]"
        >
          BOOKORA MEMBERSHIP
        </p>
        <div
          class="relative grid min-w-0 items-center gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)]"
        >
          <div class="flex min-w-0 items-center gap-4">
            <div
              class="grid size-20 shrink-0 place-items-center rounded-full border-4 shadow-sm"
              :class="tierAccents[summary.currentTier]"
            >
              <component
                :is="tierIcons[summary.currentTier]"
                class="size-10"
                aria-hidden="true"
              />
            </div>
            <div class="min-w-0">
              <h2 class="text-base font-medium">
                Hạng hiện tại:
                <strong
                  class="text-2xl font-bold text-[var(--bookora-green)]"
                  >{{ tierLabels[summary.currentTier] }}</strong
                >
              </h2>
              <p class="mt-2 text-xs text-[var(--bookora-muted)]">
                {{
                  summary.achievedAt
                    ? `Đạt hạng ngày ${membershipDate(summary.achievedAt)}`
                    : summary.currentTier === 'BRONZE'
                      ? 'Hạng thành viên mặc định'
                      : 'Ngày đạt hạng chưa đủ dữ liệu xác định'
                }}
              </p>
            </div>
          </div>
          <div
            class="min-w-0 border-t border-[var(--bookora-border)] pt-4 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-6"
          >
            <div class="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p class="text-sm text-[var(--bookora-muted)]">
                  Chi tiêu tích lũy:
                </p>
                <p
                  class="mt-1 break-words text-2xl font-bold tabular-nums text-[var(--bookora-green)] lg:text-3xl"
                >
                  {{ formatVnd(summary.lifetimeSpend) }}
                </p>
              </div>
              <p v-if="summary.nextTier" class="text-xs leading-5">
                Mốc tiếp theo:
                <strong
                  >{{ summary.nextTier.label }} ·
                  {{ formatVnd(summary.nextTier.threshold) }}</strong
                >
              </p>
            </div>
            <div
              role="progressbar"
              :aria-valuenow="Math.round(summary.progress * 100)"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-label="Tiến độ chi tiêu đến hạng tiếp theo"
              class="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--bookora-border)]"
            >
              <div
                class="h-full rounded-full bg-[var(--bookora-green)] transition-[width]"
                :style="{ width: `${summary.progress * 100}%` }"
              />
            </div>
            <p class="mt-3 text-xs leading-5 text-[var(--bookora-muted)]">
              {{
                summary.nextTier
                  ? `Chi tiêu thêm ${formatVnd(summary.remainingSpend)} để đạt hạng ${summary.nextTier.label}.`
                  : 'Bạn đã đạt hạng thành viên cao nhất!'
              }}
            </p>
          </div>
        </div>
      </article>
      <div class="grid min-w-0 gap-4 lg:grid-cols-2">
        <article
          v-for="section in sections"
          :key="section.kind"
          class="flex min-w-0 flex-col rounded-xl border border-[var(--bookora-border)] bg-white p-4 lg:p-5"
        >
          <header class="mb-3 flex gap-3">
            <component
              :is="section.icon"
              class="mt-0.5 size-6 shrink-0 text-[var(--bookora-green)]"
            />
            <div>
              <h2 class="text-lg font-bold">{{ section.title }}</h2>
              <p class="mt-1 text-xs text-[var(--bookora-muted)]">
                {{ section.description }}
              </p>
            </div>
          </header>
          <div class="min-w-0 flex-1 space-y-2">
            <template v-if="section.query.isPending.value"
              ><Skeleton v-for="n in 3" :key="n" class="h-24 w-full rounded-xl"
            /></template>
            <div
              v-else-if="section.query.isError.value"
              role="alert"
              class="py-5 text-sm"
            >
              <p>Không thể tải dữ liệu.</p>
              <Button
                variant="outline"
                size="sm"
                class="mt-2 cursor-pointer"
                @click="section.query.refetch()"
                >Thử lại</Button
              >
            </div>
            <template v-else-if="section.kind === 'coupons'"
              ><MembershipCouponCard
                v-for="coupon in coupons.data.value?.items ?? []"
                :key="coupon.id"
                :coupon="coupon"
              />
              <p
                v-if="!coupons.data.value?.items.length"
                class="py-8 text-center text-sm leading-6 text-[var(--bookora-muted)]"
              >
                Chưa có coupon thành viên phù hợp đang có hiệu lực.<br />Ưu đãi
                được mở theo từng chiến dịch.
              </p></template
            >
            <template v-else
              ><MembershipTransactionRow
                v-for="transaction in transactions.data.value?.items ?? []"
                :key="transaction.id"
                :transaction="transaction"
              />
              <p
                v-if="!transactions.data.value?.items.length"
                class="py-8 text-center text-sm leading-6 text-[var(--bookora-muted)]"
              >
                Chưa có chi tiêu được ghi nhận.<br />Đơn hoàn tất và đã thanh
                toán sẽ được tích lũy.
              </p></template
            >
          </div>
          <Button
            variant="ghost"
            class="mt-3 w-full cursor-pointer justify-between text-[var(--bookora-green)]"
            :disabled="!section.query.data.value?.totalItems"
            @click="dialog = section.kind"
            >{{ section.action }}<ChevronRight class="size-4"
          /></Button>
        </article>
      </div>
      <section
        class="min-w-0 rounded-xl border border-[var(--bookora-border)] bg-white p-4 lg:p-5"
      >
        <h2 class="mb-5 flex items-center gap-3 text-lg font-bold">
          <Layers class="size-6 shrink-0 text-[var(--bookora-green)]" />Quyền
          lợi các hạng thành viên
        </h2>
        <div class="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article
            v-for="(tier, index) in summary.tiers"
            :key="tier.tier"
            class="relative min-w-0 rounded-xl border p-3 pt-5"
            :class="
              tier.tier === summary.currentTier
                ? 'border-[var(--bookora-green)] bg-[var(--bookora-soft)]'
                : 'border-[var(--bookora-border)]'
            "
          >
            <span
              v-if="
                tier.tier === summary.currentTier ||
                tier.tier === summary.nextTier?.tier
              "
              class="absolute -top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              :class="
                tier.tier === summary.currentTier
                  ? 'bg-[var(--bookora-green)] text-white'
                  : 'bg-sky-100 text-sky-800'
              "
              >{{
                tier.tier === summary.currentTier
                  ? 'Hạng hiện tại'
                  : 'Hạng tiếp theo'
              }}</span
            >
            <div class="flex gap-2">
              <div
                class="grid size-9 shrink-0 place-items-center rounded-full border"
                :class="tierAccents[tier.tier]"
              >
                <component :is="tierIcons[tier.tier]" class="size-5" />
              </div>
              <div class="min-w-0">
                <h3 class="font-bold">{{ tier.label }}</h3>
                <p class="mt-1 text-xs leading-5">
                  Từ {{ formatVnd(tier.threshold)
                  }}{{
                    summary.tiers[index + 1]
                      ? ` đến dưới ${formatVnd(summary.tiers[index + 1]!.threshold)}`
                      : ' trở lên'
                  }}
                </p>
              </div>
            </div>
            <p
              class="mt-3 flex items-start gap-2 rounded-lg bg-[var(--bookora-canvas)] p-2 text-xs leading-5"
            >
              <Check
                class="mt-0.5 size-4 shrink-0 text-[var(--bookora-green)]"
              />{{
                tier.tier === 'BRONZE'
                  ? 'Thành viên mặc định. Coupon áp dụng theo điều kiện từng chiến dịch.'
                  : `Mở khóa coupon dành cho hạng ${tier.label} và các hạng thấp hơn khi chương trình có hiệu lực.`
              }}
            </p>
          </article>
        </div>
      </section>
      <p class="text-xs leading-5 text-[var(--bookora-muted)]">
        Chỉ tích lũy tiền hàng sau giảm giá, không gồm phí vận chuyển. Hạng đã
        đạt được giữ vĩnh viễn.
      </p>
    </template>
    <MembershipListDialog
      :open="dialog !== null"
      :kind="dialog ?? 'coupons'"
      @update:open="!$event && (dialog = null)"
    />
  </section>
</template>
