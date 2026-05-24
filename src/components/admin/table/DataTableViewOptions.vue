<script setup lang="ts" generic="TData">
import { computed } from 'vue'
import type { Column, Table } from '@tanstack/vue-table'
import { Check, Settings2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { getColumnTitle } from './utils'

interface DataTableViewOptionsProps {
  table: Table<TData>
}

const props = defineProps<DataTableViewOptionsProps>()

const columns = computed(() =>
  props.table
    .getAllColumns()
    .filter((column) => column.id !== 'select' && column.getCanHide()),
)

function toggleColumn(column: Column<TData, unknown>) {
  column.toggleVisibility(!column.getIsVisible())
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="sm" class="h-9 gap-2">
        <Settings2 class="h-4 w-4" />
        <span class="hidden sm:inline">Cột</span>
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" class="w-56">
      <DropdownMenuLabel>Cột hiển thị</DropdownMenuLabel>
      <DropdownMenuSeparator />

      <template v-if="columns.length > 0">
        <DropdownMenuItem
          v-for="column in columns"
          :key="column.id"
          class="cursor-pointer gap-2"
          @select.prevent="toggleColumn(column)"
        >
          <span
            :class="
              cn(
                'flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                column.getIsVisible()
                  ? 'bg-primary text-primary-foreground'
                  : 'opacity-50 [&_svg]:invisible',
              )
            "
          >
            <Check class="h-3 w-3" />
          </span>
          <span class="truncate">{{ getColumnTitle(column) }}</span>
        </DropdownMenuItem>
      </template>

      <div v-else class="px-2 py-4 text-center text-sm text-muted-foreground">
        Không có cột có thể ẩn
      </div>

      <DropdownMenuSeparator />
      <DropdownMenuItem
        class="cursor-pointer justify-center text-destructive focus:text-destructive"
        @select.prevent="props.table.resetColumnVisibility()"
      >
        Đặt lại mặc định
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
