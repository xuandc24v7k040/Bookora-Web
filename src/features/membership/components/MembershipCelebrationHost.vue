<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Sparkles } from '@lucide/vue'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'
import { membershipCelebration } from '../membership-celebration'
import { tierAccents, tierIcons, tierLabels } from '../membership-ui'
import MembershipCelebrationEffects from './MembershipCelebrationEffects.vue'

const route = useRoute(), router = useRouter(), auth = useAuthStore()
const blocked = ref(false)
const celebration = computed(() =>
  auth.isAuthenticated && auth.user?.type === 'CUSTOMER' &&
  membershipCelebration.pending.value?.userId === auth.user.id
    ? membershipCelebration.pending.value : null,
)
const open = computed(() => Boolean(celebration.value) && !route.path.startsWith('/checkout') && !blocked.value)
let observer: MutationObserver | undefined
onMounted(() => {
  const reconcile = () => {
    blocked.value = [...document.querySelectorAll('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')]
      .some(element => !element.hasAttribute('data-membership-celebration'))
  }
  observer = new MutationObserver(reconcile)
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state', 'role'] })
  reconcile()
})
onBeforeUnmount(() => observer?.disconnect())
function close(value: boolean) { if (!value) membershipCelebration.dismiss() }
function explore() {
  membershipCelebration.dismiss()
  void router.push('/account/membership')
}
</script>

<template>
  <Dialog :open="open" @update:open="close">
    <DialogContent v-if="celebration" data-membership-celebration overlay-class="z-[79] motion-reduce:animate-none" class="membership-celebration z-[80] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl px-5 pb-6 pt-10 text-center sm:px-8">
      <div class="mx-auto flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700" aria-hidden="true"><Sparkles class="size-6" /></div>
      <DialogHeader class="items-center text-center">
        <DialogTitle class="text-2xl font-bold">Chúc mừng bạn!</DialogTitle>
        <DialogDescription class="text-center">Bạn đã thăng hạng thành viên Bookora</DialogDescription>
      </DialogHeader>
      <div class="relative mx-auto flex w-full min-w-0 flex-col items-center gap-3 overflow-hidden rounded-2xl border px-4 py-6" :class="tierAccents[celebration.tier]">
        <MembershipCelebrationEffects :active="open">
          <component :is="tierIcons[celebration.tier]" class="size-16" aria-hidden="true" />
        </MembershipCelebrationEffects>
        <p class="break-words text-2xl font-bold">Hạng {{ tierLabels[celebration.tier] }}</p>
      </div>
      <p class="text-sm leading-relaxed text-muted-foreground">Xem các ưu đãi đang áp dụng dành cho hạng thành viên của bạn.</p>
      <div class="grid gap-2 pt-1">
        <Button class="h-auto min-h-11 cursor-pointer whitespace-normal rounded-xl bg-[var(--celebration-green)] text-white hover:bg-[var(--celebration-green-hover)]" @click="explore">Khám phá quyền lợi</Button>
        <Button variant="ghost" class="min-h-11 cursor-pointer rounded-xl" @click="membershipCelebration.dismiss()">Để sau</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style>
.membership-celebration {
  --celebration-green: oklch(0.38 0.095 148);
  --celebration-green-hover: oklch(0.32 0.085 148);
  --ring: var(--celebration-green);
}
.membership-celebration button:not(:disabled) { cursor: pointer; }
@media (prefers-reduced-motion: reduce) {
  .membership-celebration { animation: none !important; transition: none !important; }
}
</style>
