<script setup lang="ts">
import { computed, ref, watch } from "vue";
const props = defineProps<{ name: string; url?: string | null }>();
const failed = ref(false);
watch(
  () => props.url,
  () => {
    failed.value = false;
  },
);
const initials = computed(
  () =>
    props.name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((word) => word[0])
      .join("") || "KH",
);
</script>
<template>
  <span
    class="inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold"
  >
    <img
      v-if="url && !failed"
      :src="url"
      :alt="name"
      class="size-full object-cover"
      referrerpolicy="no-referrer"
      @error="failed = true"
    />
    <span v-else aria-hidden="true">{{ initials }}</span>
  </span>
</template>
