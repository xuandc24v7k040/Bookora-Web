<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
const props = defineProps<{
  endAt: string;
  serverNow: string;
  labeled?: boolean;
}>();
const emit = defineEmits<{ expired: [] }>();
const remaining = ref(0);
let offset = 0;
let emitted = false;
function tick() {
  remaining.value = Math.max(
    0,
    Math.ceil((Date.parse(props.endAt) - Date.now() - offset) / 1000),
  );
  if (!remaining.value && !emitted) {
    emitted = true;
    emit("expired");
  }
}
watch(
  () => [props.endAt, props.serverNow],
  () => {
    offset = Date.parse(props.serverNow) - Date.now();
    emitted = false;
    tick();
  },
  { immediate: true },
);
const timer = setInterval(tick, 1000);
onBeforeUnmount(() => clearInterval(timer));
const parts = computed(() =>
  [
    Math.floor(remaining.value / 3600),
    Math.floor(remaining.value / 60) % 60,
    remaining.value % 60,
  ].map((n) => String(n).padStart(2, "0")),
);
</script>
<template>
  <span
    class="inline-flex max-w-full items-start gap-1 sm:gap-2 whitespace-nowrap font-bold tabular-nums"
    role="timer"
    :aria-label="`${parts[0]} giờ ${parts[1]} phút ${parts[2]} giây`"
  >
    <template v-for="(part, index) in parts" :key="index"
      ><span v-if="index" class="py-1" aria-hidden="true">:</span
      ><span class="inline-flex flex-col items-center gap-1">
        <span
          class="min-w-7 rounded-md bg-white px-1.5 py-1 text-center text-green-900 shadow-sm"
          >{{ part }}</span
        >
        <span v-if="labeled" class="text-[10px] font-semibold">{{
          ["GIỜ", "PHÚT", "GIÂY"][index]
        }}</span>
      </span></template
    >
  </span>
</template>
