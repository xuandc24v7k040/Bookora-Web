<script setup lang="ts" generic="TData">
import { computed, ref, watch, type Component } from 'vue'
import type { Column, ColumnFilter, Table } from '@tanstack/vue-table'
import { Search, X } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type {
  DataTableDateColumn,
  DataTableFilterableColumn,
  DataTableFilterOption,
  DataTableGlobalSearch,
  DataTableSearchableColumn,
  DateRangeValue,
} from './interface'
import DataTableDateRangeFilter from './DataTableDateRangeFilter.vue'
import DataTableFacetedFilter from './DataTableFacetedFilter.vue'
import DataTableViewOptions from './DataTableViewOptions.vue'
import { formatDateRangeValue, getColumnTitle, getOptionLabels, isDateRangeValue } from './utils'

interface DataTableToolbarProps {
  table: Table<TData>
  globalSearch?: DataTableGlobalSearch
  searchableColumns?: DataTableSearchableColumn[]
  filterableColumns?: DataTableFilterableColumn[]
  dateColumns?: DataTableDateColumn[]
  selectedIds?: string[]
  selectedRows?: TData[]
  selectedCurrentPageRows?: TData[]
}

type ColumnConfig =
  | { type: 'filter'; config: DataTableFilterableColumn }
  | { type: 'date'; config: DataTableDateColumn }
  | { type: 'search'; config: DataTableSearchableColumn }

interface ActiveFilter {
  id: string
  label: string
  value: string
  type: 'search' | 'filter' | 'date' | 'sorting' | 'global'
  icon?: Component
}

const props = withDefaults(defineProps<DataTableToolbarProps>(), {
  searchableColumns: () => [],
  filterableColumns: () => [],
  dateColumns: () => [],
  selectedIds: () => [],
  selectedRows: () => [],
  selectedCurrentPageRows: () => [],
})

const searchValues = ref<Record<string, string>>({})
const globalSearchValue = ref(getGlobalFilterText())

props.searchableColumns.forEach((column) => {
  searchValues.value[column.id] = getColumnFilterText(column.id)
})

const hasSecondaryControls = computed(
  () =>
    props.selectedIds.length > 0 ||
    props.filterableColumns.length > 0 ||
    props.dateColumns.length > 0,
)

const columnConfigMap = computed(() => {
  const map = new Map<string, ColumnConfig>()

  props.filterableColumns.forEach((column) =>
    map.set(column.id, { type: 'filter', config: column }),
  )
  props.dateColumns.forEach((column) => map.set(column.id, { type: 'date', config: column }))
  props.searchableColumns.forEach((column) =>
    map.set(column.id, { type: 'search', config: column }),
  )

  return map
})

const activeFilters = computed<ActiveFilter[]>(() => {
  const filters: ActiveFilter[] = []
  const globalFilter = getGlobalFilterText()

  if (globalFilter) {
    filters.push({
      id: '__global__',
      label: props.globalSearch?.title || 'Tìm kiếm',
      value: globalFilter,
      type: 'global',
    })
  }

  props.table.getState().columnFilters.forEach((filter) => {
    const column = props.table.getColumn(filter.id)
    const columnConfig = columnConfigMap.value.get(filter.id)
    const valueLabel = getFilterLabel(filter, columnConfig, column)

    if (!valueLabel) return

    filters.push({
      id: filter.id,
      label: getFilterTitle(filter, columnConfig, column),
      value: valueLabel,
      type: columnConfig?.type || 'search',
    })
  })

  props.table.getState().sorting.forEach((sort) => {
    const column = props.table.getColumn(sort.id)
    if (!column) return

    filters.push({
      id: sort.id,
      label: `Sắp xếp: ${getColumnTitle(column)}`,
      value: sort.desc ? 'Giảm dần' : 'Tăng dần',
      type: 'sorting',
    })
  })

  return filters
})

function getColumnFilterText(columnId?: string): string {
  if (!columnId) return ''

  const value = props.table.getColumn(columnId)?.getFilterValue()
  return typeof value === 'string' ? value : ''
}

function getGlobalFilterText(): string {
  const value = props.table.getState().globalFilter
  return typeof value === 'string' ? value : ''
}

function getFilterTitle(
  filter: ColumnFilter,
  columnConfig: ColumnConfig | undefined,
  column: Column<TData, unknown> | undefined,
): string {
  if (columnConfig) return columnConfig.config.title
  return column ? getColumnTitle(column) : filter.id
}

function getFilterLabel(
  filter: ColumnFilter,
  columnConfig: ColumnConfig | undefined,
  column: Column<TData, unknown> | undefined,
): string | null {
  if (columnConfig?.type === 'search') {
    return (
      columnConfig.config.getLabel?.(filter.value) ?? (filter.value ? String(filter.value) : null)
    )
  }

  if (columnConfig?.type === 'filter') {
    if (columnConfig.config.getLabel) {
      return columnConfig.config.getLabel(filter.value, columnConfig.config.options)
    }
    return getOptionLabels(filter.value, columnConfig.config.options) || null
  }

  if (columnConfig?.type === 'date') {
    if (columnConfig.config.getLabel) return columnConfig.config.getLabel(filter.value)
    return formatDateRangeValue(filter.value)
  }

  const metaOptions = column?.columnDef.meta?.options as DataTableFilterOption[] | undefined
  if (metaOptions?.length) return getOptionLabels(filter.value, metaOptions) || null

  return filter.value ? String(filter.value) : null
}

function setColumnFilter(columnId: string, value: string) {
  props.table.getColumn(columnId)?.setFilterValue(value || undefined)
}

function updateSearch(columnId: string, value: string | number) {
  const stringValue = String(value)
  searchValues.value[columnId] = stringValue
  setColumnFilter(columnId, stringValue)
}

function triggerSearch(columnId: string) {
  setColumnFilter(columnId, searchValues.value[columnId] || '')
}

function updateGlobalSearch(value: string | number) {
  const stringValue = String(value)
  globalSearchValue.value = stringValue
  props.table.setGlobalFilter(stringValue)
}

function triggerGlobalSearch() {
  props.table.setGlobalFilter(globalSearchValue.value)
}

function getDateFilterValue(columnId: string): DateRangeValue | undefined {
  const value = props.table.getColumn(columnId)?.getFilterValue()
  return isDateRangeValue(value) ? value : undefined
}

function removeFilter(filter: ActiveFilter) {
  if (filter.type === 'global') {
    globalSearchValue.value = ''
    props.table.setGlobalFilter('')
    return
  }

  const column = props.table.getColumn(filter.id)

  if (filter.type === 'sorting') {
    column?.clearSorting()
    return
  }

  if (filter.type === 'search') {
    searchValues.value[filter.id] = ''
  }

  column?.setFilterValue(undefined)
}

function resetFilters() {
  props.table.resetColumnFilters()
  props.table.resetSorting()
  props.table.setGlobalFilter('')
  globalSearchValue.value = ''
  props.searchableColumns.forEach((column) => {
    searchValues.value[column.id] = ''
  })
}

function warnMissingColumnIds() {
  if (!import.meta.env.DEV) return

  const existingColumnIds = new Set(props.table.getAllColumns().map((column) => column.id))
  const configuredIds = [
    ...(props.globalSearch?.columnIds ?? []),
    ...props.searchableColumns.map((column) => column.id),
    ...props.filterableColumns.map((column) => column.id),
    ...props.dateColumns.map((column) => column.id),
  ]

  configuredIds.forEach((id) => {
    if (!existingColumnIds.has(id)) {
      console.warn(`[DataTable] Column id "${id}" is configured in toolbar but does not exist.`)
    }
  })
}

watch(
  () => props.table.getState().columnFilters,
  (filters) => {
    props.searchableColumns.forEach((column) => {
      const filter = filters.find((item) => item.id === column.id)
      searchValues.value[column.id] = filter && typeof filter.value === 'string' ? filter.value : ''
    })
  },
  { deep: true },
)

watch(
  () => props.table.getState().globalFilter,
  () => {
    globalSearchValue.value = getGlobalFilterText()
  },
)

watch(
  () => [
    props.table.getAllColumns().map((column) => column.id).join('|'),
    props.globalSearch?.columnIds.join('|') ?? '',
    props.searchableColumns.map((column) => column.id).join('|'),
    props.filterableColumns.map((column) => column.id).join('|'),
    props.dateColumns.map((column) => column.id).join('|'),
  ],
  warnMissingColumnIds,
  { immediate: true },
)
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <slot
          name="left"
          :table="table"
          :selected-ids="selectedIds"
          :selected-rows="selectedRows"
          :selected-current-page-rows="selectedCurrentPageRows"
        />

        <div v-if="globalSearch" class="relative w-full sm:w-70">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            :placeholder="globalSearch.placeholder || 'Tìm kiếm...'"
            :model-value="globalSearchValue"
            class="h-9 pl-9"
            @update:model-value="updateGlobalSearch"
            @keydown.enter="triggerGlobalSearch"
          />
        </div>

        <div v-for="column in searchableColumns" :key="column.id" class="relative w-full sm:w-64">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            :placeholder="column.placeholder || `Tìm ${column.title}...`"
            :model-value="searchValues[column.id] ?? ''"
            class="h-9 pl-9"
            @update:model-value="(value) => updateSearch(column.id, value)"
            @keydown.enter="triggerSearch(column.id)"
          />
        </div>
      </div>

      <div class="flex shrink-0 items-center justify-end gap-2">
        <slot name="actions" :table="table" />
        <DataTableViewOptions :table="table" />
      </div>
    </div>

    <div
      v-if="hasSecondaryControls || $slots.filters || $slots['bulk-actions']"
      class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <div v-if="selectedIds.length > 0" class="flex flex-wrap gap-2">
        <slot
          name="bulk-actions"
          :selected-rows="selectedCurrentPageRows"
          :selected-current-page-rows="selectedCurrentPageRows"
          :selected-ids="selectedIds"
        />
      </div>

      <div
        v-if="selectedIds.length > 0 && (filterableColumns.length || dateColumns.length)"
        class="hidden h-5 w-px bg-border sm:block"
      />

      <DataTableFacetedFilter
        v-for="column in filterableColumns"
        :key="column.id"
        :column="table.getColumn(column.id)"
        :title="column.title"
        :options="column.options"
      />

      <DataTableDateRangeFilter
        v-for="column in dateColumns"
        :key="column.id"
        :model-value="getDateFilterValue(column.id)"
        :placeholder="column.placeholder || column.title"
        @update:model-value="(value) => table.getColumn(column.id)?.setFilterValue(value)"
      />

      <slot name="filters" :table="table" />
    </div>

    <TransitionGroup
      v-if="activeFilters.length > 0"
      name="filter-chip"
      tag="div"
      class="flex flex-wrap items-center gap-2"
    >
      <Badge
        v-for="filter in activeFilters"
        :key="`${filter.type}-${filter.id}-${filter.value}`"
        variant="outline"
        class="max-w-full gap-1.5 rounded-md border-dashed px-2 py-1 text-sm font-normal"
      >
        <span class="text-muted-foreground">{{ filter.label }}</span>
        <span class="h-3 w-px bg-border" />
        <span class="max-w-55 truncate text-foreground">{{ filter.value }}</span>
        <button
          type="button"
          :aria-label="`Xóa bộ lọc ${filter.label}`"
          class="rounded-full p-0.5 transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
          @click="removeFilter(filter)"
        >
          <X class="h-3 w-3 text-muted-foreground" />
        </button>
      </Badge>

      <Button
        key="clear-all"
        variant="ghost"
        size="sm"
        class="h-8 px-2 text-destructive hover:text-destructive"
        @click="resetFilters"
      >
        Xóa tất cả
      </Button>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.filter-chip-move,
.filter-chip-enter-active,
.filter-chip-leave-active {
  transition: all 0.18s ease;
}

.filter-chip-enter-from,
.filter-chip-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.filter-chip-leave-active {
  position: absolute;
}
</style>
