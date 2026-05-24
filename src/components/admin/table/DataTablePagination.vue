<script setup lang="ts" generic="TData">
import { computed, nextTick, ref } from 'vue'
import type { Table } from '@tanstack/vue-table'
import type { AcceptableValue } from 'reka-ui'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DataTablePaginationProps {
  table: Table<TData>
  pageSizeOptions?: number[]
  selectedIds?: string[]
}

const props = withDefaults(defineProps<DataTablePaginationProps>(), {
  pageSizeOptions: () => [10, 20, 30, 50, 100],
  selectedIds: () => [],
})

const isCustomInput = ref(false)
const customPageSize = ref('')
const customInputRef = ref<HTMLInputElement | null>(null)
const customPageSizeError = ref('')

const pagination = computed(() => props.table.getState().pagination)
const currentPage = computed(() => pagination.value.pageIndex + 1)
const pageSize = computed(() => pagination.value.pageSize)
const rawPageCount = computed(() => props.table.getPageCount())
const hasKnownPageCount = computed(() => rawPageCount.value > 0)
const totalPages = computed(() => (hasKnownPageCount.value ? rawPageCount.value : 0))
const selectedRowCount = computed(() => props.selectedIds.length)
const currentPageSize = computed(() =>
  props.pageSizeOptions.includes(pageSize.value) ? String(pageSize.value) : 'custom',
)

function handlePageSizeChange(value: AcceptableValue) {
  if (value === 'custom') {
    openCustomInput()
    return
  }

  const nextSize = Number(value)
  if (Number.isInteger(nextSize) && nextSize > 0) {
    setPageSize(nextSize)
  }
}

function openCustomInput() {
  isCustomInput.value = true
  customPageSize.value = String(pageSize.value)
  customPageSizeError.value = ''
  nextTick(() => {
    customInputRef.value?.focus()
    customInputRef.value?.select()
  })
}

function setPageSize(nextSize: number) {
  props.table.setPagination({
    pageIndex: 0,
    pageSize: nextSize,
  })
}

function submitCustomPageSize() {
  const parsedSize = Number(customPageSize.value)
  const errorMessage = validatePageSize(customPageSize.value, parsedSize)

  if (errorMessage) {
    customPageSizeError.value = errorMessage
    customPageSize.value = String(pageSize.value)
    return
  }

  setPageSize(parsedSize)
  customPageSizeError.value = ''
  isCustomInput.value = false
}

function validatePageSize(rawValue: string, value: number): string | null {
  if (!rawValue.trim()) return 'Vui lòng nhập số dòng/trang'
  if (Number.isNaN(value)) return 'Số dòng/trang phải là số hợp lệ'
  if (!Number.isInteger(value)) return 'Số dòng/trang phải là số nguyên'
  if (value < 1) return 'Số dòng/trang phải lớn hơn 0'
  if (value > 1000) return 'Số dòng/trang không được vượt quá 1000'
  return null
}

function handleCustomInputKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    submitCustomPageSize()
  }

  if (event.key === 'Escape') {
    isCustomInput.value = false
    customPageSize.value = ''
    customPageSizeError.value = ''
  }
}

function goToLastPage() {
  if (!hasKnownPageCount.value) return
  props.table.setPageIndex(Math.max(totalPages.value - 1, 0))
}
</script>

<template>
  <div class="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
    <div class="min-h-5 text-sm text-muted-foreground">
      <span v-if="selectedRowCount > 0">
        Đã chọn <strong>{{ selectedRowCount }}</strong> dòng
      </span>
    </div>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
      <div class="flex items-center justify-between gap-2 sm:justify-start">
        <span class="text-sm font-medium">Dòng/trang</span>

        <div v-if="isCustomInput" class="relative">
          <Input
            ref="customInputRef"
            v-model="customPageSize"
            type="number"
            min="1"
            max="1000"
            class="h-8 w-19 text-center"
            :aria-invalid="Boolean(customPageSizeError)"
            @blur="submitCustomPageSize"
            @keydown="handleCustomInputKeydown"
          />
          <p
            v-if="customPageSizeError"
            class="absolute right-0 top-9 z-10 w-56 rounded-md border bg-background p-2 text-xs text-destructive shadow-sm"
          >
            {{ customPageSizeError }}
          </p>
        </div>

        <Select v-else :model-value="currentPageSize" @update:model-value="handlePageSizeChange">
          <SelectTrigger class="h-8 w-19">
            <SelectValue>{{ pageSize }}</SelectValue>
          </SelectTrigger>
          <SelectContent side="top">
            <SelectItem v-for="size in pageSizeOptions" :key="size" :value="String(size)">
              {{ size }}
            </SelectItem>
            <SelectItem value="custom">Tùy chỉnh...</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex items-center justify-between gap-3 sm:justify-start">
        <div class="min-w-27 text-center text-sm font-medium">
          <template v-if="hasKnownPageCount">Trang {{ currentPage }} / {{ totalPages }}</template>
          <template v-else>Trang {{ currentPage }}</template>
        </div>

        <div class="flex items-center gap-1">
          <Button
            variant="outline"
            class="hidden h-8 w-8 p-0 lg:flex"
            :disabled="!table.getCanPreviousPage()"
            @click="table.setPageIndex(0)"
          >
            <span class="sr-only">Trang đầu</span>
            <ChevronsLeft class="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            class="h-8 w-8 p-0"
            :disabled="!table.getCanPreviousPage()"
            @click="table.previousPage()"
          >
            <span class="sr-only">Trang trước</span>
            <ChevronLeft class="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            class="h-8 w-8 p-0"
            :disabled="!table.getCanNextPage()"
            @click="table.nextPage()"
          >
            <span class="sr-only">Trang sau</span>
            <ChevronRight class="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            class="hidden h-8 w-8 p-0 lg:flex"
            :disabled="!hasKnownPageCount || !table.getCanNextPage()"
            @click="goToLastPage"
          >
            <span class="sr-only">Trang cuối</span>
            <ChevronsRight class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
