<script setup lang="ts">
import { Sparkles } from '@lucide/vue'

defineProps<{ active: boolean }>()

// Fixed, small particle set: no random layout, timers, listeners or animation loop.
const confetti = [
  { left: '5%', drift: '-14px', turn: '-150deg', delay: '0ms' },
  { left: '13%', drift: '9px', turn: '190deg', delay: '120ms' },
  { left: '22%', drift: '-11px', turn: '-210deg', delay: '60ms' },
  { left: '30%', drift: '12px', turn: '160deg', delay: '180ms' },
  { left: '39%', drift: '-8px', turn: '-180deg', delay: '30ms' },
  { left: '47%', drift: '10px', turn: '220deg', delay: '150ms' },
  { left: '55%', drift: '-10px', turn: '-160deg', delay: '90ms' },
  { left: '64%', drift: '8px', turn: '180deg', delay: '0ms' },
  { left: '72%', drift: '-12px', turn: '-220deg', delay: '150ms' },
  { left: '81%', drift: '11px', turn: '210deg', delay: '60ms' },
  { left: '89%', drift: '-9px', turn: '-190deg', delay: '180ms' },
  { left: '97%', drift: '14px', turn: '150deg', delay: '30ms' },
]
const sparkles = [
  { left: '-18px', top: '5px', delay: '140ms' },
  { left: '65px', top: '-9px', delay: '280ms' },
  { left: '76px', top: '38px', delay: '80ms' },
  { left: '-10px', top: '58px', delay: '400ms' },
]
</script>

<template>
  <div
    aria-hidden="true"
    class="celebration-effects pointer-events-none relative isolate grid size-16 shrink-0 place-items-center"
    :class="{ 'celebration-effects--active': active }"
  >
    <div class="celebration-confetti absolute -inset-x-24 -top-5 -bottom-12 overflow-hidden">
      <span
        v-for="(piece, index) in confetti"
        :key="index"
        class="celebration-confetti-piece"
        :style="{
          left: piece.left,
          '--confetti-drift': piece.drift,
          '--confetti-turn': piece.turn,
          '--effect-delay': piece.delay,
        }"
      />
    </div>
    <div class="celebration-badge-pop grid size-16 place-items-center">
      <slot />
    </div>
    <Sparkles
      v-for="(sparkle, index) in sparkles"
      :key="index"
      class="celebration-sparkle absolute size-3.5"
      :style="{ left: sparkle.left, top: sparkle.top, '--effect-delay': sparkle.delay }"
    />
  </div>
</template>

<style scoped>
.celebration-confetti-piece {
  position: absolute;
  top: 0;
  width: 4px;
  height: 8px;
  border-radius: 1px;
  background: currentColor;
  opacity: 0;
}
.celebration-confetti-piece:nth-child(3n) {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}
.celebration-confetti-piece:nth-child(even) {
  background: color-mix(in srgb, currentColor 55%, white);
}
.celebration-sparkle { opacity: 0; }
.celebration-effects--active .celebration-confetti-piece {
  animation: membership-confetti 1500ms cubic-bezier(0.18, 0.65, 0.35, 1) var(--effect-delay) 1 both;
}
.celebration-effects--active .celebration-badge-pop {
  animation: membership-badge-pop 720ms cubic-bezier(0.22, 1, 0.36, 1) 80ms 1 both;
}
.celebration-effects--active .celebration-sparkle {
  animation: membership-sparkle 1200ms ease-in-out var(--effect-delay) 1 both;
}
@keyframes membership-confetti {
  0% { opacity: 0; transform: translate3d(0, -10px, 0) rotate(0deg); }
  12% { opacity: 0.75; }
  75% { opacity: 0.6; }
  100% { opacity: 0; transform: translate3d(var(--confetti-drift), 120px, 0) rotate(var(--confetti-turn)); }
}
@keyframes membership-badge-pop {
  0% { opacity: 0; transform: scale(0.65); }
  55% { opacity: 1; transform: scale(1.09); }
  78% { opacity: 1; transform: scale(0.98); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes membership-sparkle {
  0%, 100% { opacity: 0; transform: scale(0.5) rotate(-12deg); }
  35% { opacity: 0.8; transform: scale(1.1) rotate(8deg); }
  65% { opacity: 0.4; }
}
@media (prefers-reduced-motion: reduce) {
  .celebration-confetti, .celebration-sparkle { display: none; }
  .celebration-confetti-piece, .celebration-badge-pop, .celebration-sparkle {
    animation: none !important;
  }
  .celebration-badge-pop { opacity: 1; transform: none; }
}
</style>
