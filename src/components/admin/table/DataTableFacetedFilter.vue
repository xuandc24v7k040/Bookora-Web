<script setup lang="ts" generic="TData">
import { computed, ref } from 'vue'
import type { Column } from '@tanstack/vue-table'
import { Check, PlusCircle } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { DataTableFilterOption } from './interface'
import { toStringArray } from './utils'

interface DataTableFacetedFilterProps {
  column?: Column<TData, unknown>
  title?: string
  options: DataTableFilterOption[]
  showCounts?: boolean
}

const props = withDefaults(defineProps<DataTableFacetedFilterProps>(), {
  showCounts: false,
})
const isOpen = ref(false)
const searchQuery = ref('')

const facets = computed(() => (props.showCounts ? props.column?.getFacetedUniqueValues() : undefined))
const selectedValues = computed(() => new Set(toStringArray(props.column?.getFilterValue())))
const selectedOptions = computed(() =>
  props.options.filter((option) => selectedValues.value.has(option.value)),
)
const filteredOptions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return props.options

  return props.options.filter((option) => option.label.toLowerCase().includes(query))
})

function handleSelect(value: string) {
  if (!props.column) return

  const filterValues = new Set(selectedValues.value)
  if (filterValues.has(value)) filterValues.delete(value)
  else filterValues.add(value)

  const nextValue = Array.from(filterValues)
  props.column.setFilterValue(nextValue.length > 0 ? nextValue : undefined)
}

function clearFilters() {
  props.column?.setFilterValue(undefined)
  isOpen.value = false
}
</script>

<template>
  <Popover v-model:open="isOpen">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        size="sm"
        :disabled="!column"
        class="h-9 max-w-full border-dashed"
        :class="{ 'border-primary': selectedValues.size > 0 }"
      >
        <PlusCircle class="mr-2 h-4 w-4" />
        <span class="truncate">{{ title }}</span>

        <template v-if="selectedValues.size > 0">
          <Separator orientation="vertical" class="mx-2 h-4" />
          <Badge variant="secondary" class="rounded-sm px-1 font-normal lg:hidden">
            {{ selectedValues.size }}
          </Badge>
          <div class="hidden min-w-0 items-center gap-1 lg:flex">
            <Badge
              v-if="selectedValues.size > 2"
              variant="secondary"
              class="rounded-sm px-1 font-normal"
            >
              {{ selectedValues.size }} đã chọn
            </Badge>
            <template v-else>
              <Badge
                v-for="option in selectedOptions"
                :key="option.value"
                variant="secondary"
                class="max-w-30 truncate rounded-sm px-1 font-normal"
              >
                {{ option.label }}
              </Badge>
            </template>
          </div>
        </template>
      </Button>
    </PopoverTrigger>

    <PopoverContent class="w-56 p-2" align="start">
      <div class="space-y-2">
        <Input v-model="searchQuery" :placeholder="title" class="h-8" />

        <div class="max-h-64 overflow-y-auto">
          <p
            v-if="filteredOptions.length === 0"
            class="px-2 py-6 text-center text-sm text-muted-foreground"
          >
            Không tìm thấy.
          </p>

          <button
            v-for="option in filteredOptions"
            :key="option.value"
            type="button"
            class="flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
            @click="handleSelect(option.value)"
          >
            <span
              :class="
                cn(
                  'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                  selectedValues.has(option.value)
                    ? 'bg-primary text-primary-foreground'
                    : 'opacity-50 [&_svg]:invisible',
                )
              "
            >
              <Check class="h-4 w-4" />
            </span>
            <component
              :is="option.icon"
              v-if="option.icon"
              class="mr-2 h-4 w-4 text-muted-foreground"
            />
            <span class="flex-1 truncate">{{ option.label }}</span>
            <span
              v-if="showCounts && facets?.get(option.value)"
              class="ml-auto flex h-4 min-w-4 items-center justify-center font-mono text-xs"
            >
              {{ facets.get(option.value) }}
            </span>
          </button>
        </div>

        <div v-if="selectedValues.size > 0" class="border-t pt-2">
          <Button variant="ghost" size="sm" class="h-8 w-full" @click="clearFilters">
            Xóa bộ lọc
          </Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
