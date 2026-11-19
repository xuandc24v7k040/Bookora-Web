<script setup lang="ts">
import { Button } from "@/components/ui/button";
import type { PriceMode } from "../flash-sale-form";
withDefaults(defineProps<{ label?: string; disabled?: boolean }>(), {
  label: "Cách nhập giá",
  disabled: false,
});
const mode = defineModel<PriceMode>({ required: true });
</script>
<template>
  <div
    class="inline-flex shrink-0 rounded-md border p-0.5"
    role="group"
    :aria-label="label"
  >
    <Button
      v-for="value in ['VND', 'PERCENT'] as const"
      :key="value"
      type="button"
      size="sm"
      :variant="mode === value ? 'secondary' : 'ghost'"
      class="h-7 px-2"
      :aria-pressed="mode === value"
      :disabled="disabled"
      @click="mode = value"
      >{{ value === "VND" ? "₫" : "%" }}</Button
    >
  </div>
</template>
