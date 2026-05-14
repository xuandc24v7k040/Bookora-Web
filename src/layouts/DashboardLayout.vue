<script setup lang="ts">
import { LogOut, Moon, PanelLeft, Sun } from 'lucide-vue-next'
import { computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { Button } from '@/components/ui/button'
import { useLogoutMutation } from '@/mutations/auth.mutations'
import { useAuthStore } from '@/stores/auth.store'
import { useThemeStore } from '@/stores/theme.store'
import { useUiStore } from '@/stores/ui.store'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const uiStore = useUiStore()
const logoutMutation = useLogoutMutation()

const userName = computed(() => authStore.user?.name ?? authStore.user?.email ?? 'Guest')

function toggleTheme(): void {
  themeStore.setTheme(themeStore.resolvedTheme === 'dark' ? 'light' : 'dark')
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <header class="border-b bg-background/95 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div class="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Toggle sidebar"
            @click="uiStore.toggleSidebar"
          >
            <PanelLeft class="h-4 w-4" />
          </Button>
          <RouterLink class="font-semibold" :to="{ name: 'home' }">Exam FE</RouterLink>
        </div>

        <nav class="flex items-center gap-2">
          <RouterLink
            class="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            :to="{ name: 'dashboard' }"
          >
            Dashboard
          </RouterLink>
          <Button type="button" variant="ghost" size="icon" aria-label="Toggle theme" @click="toggleTheme">
            <Moon v-if="themeStore.resolvedTheme === 'light'" class="h-4 w-4" />
            <Sun v-else class="h-4 w-4" />
          </Button>
          <Button
            v-if="authStore.isAuthenticated"
            type="button"
            variant="outline"
            size="sm"
            :disabled="logoutMutation.isPending.value"
            @click="logoutMutation.mutate()"
          >
            <LogOut class="mr-2 h-4 w-4" />
            Logout
          </Button>
        </nav>
      </div>
    </header>

    <main class="mx-auto w-full max-w-6xl px-4 py-8">
      <p v-if="authStore.isAuthenticated" class="mb-4 text-sm text-muted-foreground">
        Signed in as {{ userName }}
      </p>
      <RouterView />
    </main>
  </div>
</template>
