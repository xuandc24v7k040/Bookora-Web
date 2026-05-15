<script setup lang="ts">
import { computed, reactive } from 'vue'
import { RouterLink } from 'vue-router'
import { useLoginMutation } from '@/api/mutations/auth.mutations'
import { Button } from '@/components/ui/button'
import { MOCK_AUTH_ACCOUNT } from '@/services/auth.service'
import type { ApiError } from '@/types/api'

const form = reactive({
  email: MOCK_AUTH_ACCOUNT.email,
  password: MOCK_AUTH_ACCOUNT.password,
})

const loginMutation = useLoginMutation()

const errorMessage = computed(() => {
  return (loginMutation.error.value as ApiError | null)?.message
})

function handleSubmit(): void {
  loginMutation.mutate({
    email: form.email,
    password: form.password,
  })
}
</script>

<template>
  <section class="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
    <div class="mb-6 space-y-2">
      <RouterLink class="text-sm text-muted-foreground hover:text-foreground" :to="{ name: 'home' }">
        Back to home
      </RouterLink>
      <h1 class="text-2xl font-semibold tracking-tight">Login</h1>
      <p class="text-sm text-muted-foreground">
        Use the demo account to access protected routes while the backend is not connected.
      </p>
      <div class="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
        <p>Email: {{ MOCK_AUTH_ACCOUNT.email }}</p>
        <p>Password: {{ MOCK_AUTH_ACCOUNT.password }}</p>
      </div>
    </div>

    <form class="space-y-4" @submit.prevent="handleSubmit">
      <label class="grid gap-2 text-sm font-medium">
        Email
        <input
          v-model.trim="form.email"
          class="h-10 rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          type="email"
          autocomplete="email"
          required
        />
      </label>

      <label class="grid gap-2 text-sm font-medium">
        Password
        <input
          v-model="form.password"
          class="h-10 rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          type="password"
          autocomplete="current-password"
          required
        />
      </label>

      <p v-if="errorMessage" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {{ errorMessage }}
      </p>

      <Button class="w-full" type="submit" :disabled="loginMutation.isPending.value">
        {{ loginMutation.isPending.value ? 'Logging in...' : 'Login' }}
      </Button>
    </form>
  </section>
</template>
