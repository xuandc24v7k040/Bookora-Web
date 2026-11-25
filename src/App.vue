<script setup lang="ts">
import "vue-sonner/style.css";
import { Toaster } from "vue-sonner";
import CustomerSupportHost from '@/features/support/components/CustomerSupportHost.vue';
</script>

<template>
  <RouterView />
  <CustomerSupportHost />
  <Toaster position="top-right" rich-colors close-button />
</template>
