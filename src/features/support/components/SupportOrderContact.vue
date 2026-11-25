<script setup lang="ts">
import { MessageCircle } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { useSupportStore } from "../state/support.store";
defineProps<{ orderId: string }>();
const store = useSupportStore();
</script>
<template>
  <Button
    type="button"
    variant="outline"
    size="sm"
    class="cursor-pointer"
    :disabled="store.contextLoading"
    @click="store.contactOrder(orderId)"
    ><MessageCircle class="size-3.5" />Liên hệ hỗ trợ</Button
  >
</template>
