<script setup lang="ts">
import { Crown } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { tierAccents, tierLabels, type MembershipTier } from '../membership-ui'
defineProps<{ tier: MembershipTier; minimum?: boolean }>()
</script>
<template>
  <Badge
    variant="outline"
    class="max-w-full gap-1 rounded-full text-xs whitespace-normal"
    :class="tierAccents[tier]"
  >
    <Crown class="size-3 shrink-0" aria-hidden="true" />{{ tierLabels[tier]
    }}{{ minimum && tier !== 'DIAMOND' ? ' trở lên' : '' }}
  </Badge>
</template>
