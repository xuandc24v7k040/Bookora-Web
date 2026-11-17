<script setup lang="ts">
import type { SwitchRootEmits, SwitchRootProps } from "reka-ui";
import { SwitchRoot, SwitchThumb, useForwardPropsEmits } from "reka-ui";

const props = defineProps<SwitchRootProps>();
const emit = defineEmits<SwitchRootEmits>();
const forwarded = useForwardPropsEmits(props, emit);
</script>

<template>
  <SwitchRoot
    v-bind="forwarded"
    data-slot="switch"
    class="inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-input p-0.5 transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary"
  >
    <SwitchThumb
      data-slot="switch-thumb"
      class="pointer-events-none block size-3.5 rounded-full bg-background shadow-sm transition-transform data-[state=checked]:translate-x-4"
    />
  </SwitchRoot>
</template>
