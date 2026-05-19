<script setup lang="ts">
import { Building2, Check, Search } from 'lucide-vue-next'
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import AppSidebar from '@/components/admin/sidebar/AppSidebar.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { useAuthStore } from '@/stores/auth.store'
import { useBranchStore } from '@/stores/branch.store'

const authStore = useAuthStore()
const branchStore = useBranchStore()

const roleLabel = computed(() => {
  return authStore.role === 'BRANCH_ADMIN' ? 'Branch Admin' : 'Super Admin'
})

function setSelectedBranch(value: unknown): void {
  if (value === 'can-tho' || value === 'hau-giang') {
    branchStore.setSelectedBranch(value)
  }
}
</script>

<template>
  <SidebarProvider class="min-h-screen bg-muted/30 text-foreground">
    <AppSidebar />

    <SidebarInset>
      <header class="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div class="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <div class="flex min-w-0 items-center gap-3">
            <SidebarTrigger />
            <Separator orientation="vertical" class="hidden h-6 sm:block" />

            <div class="hidden min-w-0 sm:block">
              <div class="flex items-center gap-2">
                <p class="truncate text-lg font-semibold">Bookora</p>
                <Badge variant="secondary">{{ roleLabel }}</Badge>
              </div>
              <p class="hidden truncate text-sm text-muted-foreground sm:block">
                {{ authStore.email || 'admin@bookora.local' }}
              </p>
            </div>
          </div>

          <div class="flex min-w-0 justify-center">
            <div class="relative w-full max-w-[560px]">
              <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                class="h-10 rounded-xl border-border bg-background pl-9 pr-3 shadow-sm sm:pr-20"
                placeholder="Tìm kiếm nhanh đơn hàng, khách hàng, sản phẩm,..."
              />
              <kbd
                class="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline-flex"
              >
                Ctrl + K
              </kbd>
            </div>
          </div>

          <div class="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button type="button" variant="outline" class="h-10 justify-start gap-2 rounded-xl bg-background">
                  <Building2 class="h-4 w-4 text-muted-foreground" />
                  <span class="hidden text-xs text-muted-foreground md:inline">Chi nhánh</span>
                  <span class="max-w-20 truncate font-medium sm:max-w-36">
                    {{ branchStore.selectedBranch.name }}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-56">
                <DropdownMenuLabel>Chi nhánh</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  v-for="branch in branchStore.branches"
                  :key="branch.id"
                  class="gap-2"
                  @click="setSelectedBranch(branch.id)"
                >
                  <Building2 class="h-4 w-4 text-muted-foreground" />
                  <span>{{ branch.name }}</span>
                  <Check
                    v-if="branch.id === branchStore.selectedBranchId"
                    class="ml-auto h-4 w-4 text-primary"
                  />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main class="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:py-8">
        <RouterView />
        <footer class="mt-auto pt-8 text-sm text-muted-foreground">
          © 2025 Bookora. All rights reserved.
        </footer>
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>
