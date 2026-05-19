<script setup lang="ts">
import logoUrl from '@/assets/logo.png'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

defineProps<{
  brand: {
    name: string;
    subtitle: string;
  };
}>();
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton
        size="lg"
        tooltip="Bookora"
        class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
      >
        <img :src="logoUrl" alt="Bookora" class="size-10 object-contain group-data-[collapsible=icon]:size-8" />
        <div class="grid flex-1 text-left text-sm leading-tight">
          <span class="truncate text-base font-semibold">{{ brand.name }}</span>
          <span class="truncate text-xs">{{ brand.subtitle }}</span>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
