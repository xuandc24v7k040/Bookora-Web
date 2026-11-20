<script setup lang="ts">
import AuthVisualPanel from "@/components/client/auth/AuthVisualPanel.vue";
import EmailVerificationForm from "@/features/email-verification/components/EmailVerificationForm.vue";
</script>

<template>
  <div class="grid w-full md:min-h-[clamp(650px,calc(100dvh-48px),720px)] md:grid-cols-[42fr_58fr]">
    <AuthVisualPanel variant="login" />
    <EmailVerificationForm />
  </div>
</template>
