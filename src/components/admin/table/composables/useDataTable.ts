import {
  getCoreRowModel,
  getExpandedRowModel,
  useVueTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ExpandedState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type Updater,
  type VisibilityState,
} from '@tanstack/vue-table'
import { useDebounceFn } from '@vueuse/core'
import { computed, ref, unref, watch, type Ref } from 'vue'
import type {
  DataTableConfig,
  DataTableFilterOperator,
  DataTableQuery,
} from '../interface'
import { isDateRangeValue, toDataTableFilterValue } from '../utils'
import {
  getDataTablePersistedState,
  useDataTablePersistence,
} from './useDataTablePersistence'
import {
  getDataTableRouteSyncedState,
  useDataTableRouteSync,
} from './useDataTableRouteSync'

interface UseDataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[] | Ref<ColumnDef<TData, unknown>[]>
  data: TData[] | Ref<TData[]>
  pageCount?: number | Ref<number | undefined>
  rowCount?: number | Ref<number | undefined>
  config?: DataTableConfig<TData> | Ref<DataTableConfig<TData> | undefined>
  searchColumnIds?: string[] | Ref<string[]>
  selectedRowIds?: string[] | Ref<string[] | undefined>
  onQueryChange?: (query: DataTableQuery) => void
  onSelectionChange?: (ids: string[]) => void
  defaultPageSize?: number | Ref<number>
}

function applyUpdater<TValue>(currentValue: TValue, updaterOrValue: Updater<TValue>): TValue {
  return typeof updaterOrValue === 'function'
    ? (updaterOrValue as (old: TValue) => TValue)(currentValue)
    : updaterOrValue
}

function getRowIdFromKey<TData>(
  row: TData,
  index: number,
  idKey: Extract<keyof TData, string> | 'id',
): string {
  const value = (row as Record<string, unknown>)[idKey]

  if (value === null || value === undefined || value === '') {
    return `row-${index}`
  }

  return String(value)
}

let hasWarnedMissingRowId = false

function warnMissingRowId() {
  if (hasWarnedMissingRowId) return
  hasWarnedMissingRowId = true

  if (import.meta.env.DEV) {
    console.warn(
      '[DataTable] Row selection is enabled but a row is missing a stable id. Provide config.rowIdKey or config.getRowId to avoid cross-page selection bugs.',
    )
  }
}

function getFilterOperator(value: unknown): DataTableFilterOperator {
  if (isDateRangeValue(value)) return 'between'
  if (Array.isArray(value)) return 'in'
  if (typeof value === 'string') return 'contains'
  return 'equals'
}

function getRowSelectionFromIds(ids: string[] | undefined): RowSelectionState {
  return (ids ?? []).reduce<RowSelectionState>((selection, id) => {
    selection[id] = true
    return selection
  }, {})
}

function getSelectedIds(selection: RowSelectionState): string[] {
  return Object.keys(selection).filter((id) => selection[id])
}

function areStringArraysEqual(first: string[], second: string[]): boolean {
  if (first.length !== second.length) return false
  return first.every((value, index) => value === second[index])
}

export function useDataTable<TData>({
  columns,
  data,
  pageCount,
  rowCount,
  config = {},
  searchColumnIds = [],
  selectedRowIds,
  onQueryChange,
  onSelectionChange,
  defaultPageSize = 10,
}: UseDataTableProps<TData>) {
  const resolvedConfig = computed(() => unref(config) ?? {})
  const resolvedSearchColumnIds = computed(() => unref(searchColumnIds))
  const resolvedSelectedRowIds = computed(() => unref(selectedRowIds))
  const persistedState = getDataTablePersistedState(resolvedConfig.value)
  const routeSyncedState = getDataTableRouteSyncedState(resolvedConfig.value)
  const rowSelection = ref<RowSelectionState>(getRowSelectionFromIds(resolvedSelectedRowIds.value))
  const columnVisibility = ref<VisibilityState>(
    persistedState.columnVisibility ?? resolvedConfig.value.initialColumnVisibility ?? {},
  )
  const columnFilters = ref<ColumnFiltersState>(
    routeSyncedState.columnFilters ?? resolvedConfig.value.initialFilters ?? [],
  )
  const sorting = ref<SortingState>(
    routeSyncedState.sorting ?? persistedState.sorting ?? resolvedConfig.value.initialSorting ?? [],
  )
  const expanded = ref<ExpandedState>(resolvedConfig.value.initialExpanded || {})
  const globalFilter = ref(routeSyncedState.globalFilter ?? resolvedConfig.value.initialSearch ?? '')

  const pagination = ref<PaginationState>({
    pageIndex: routeSyncedState.pagination?.pageIndex ?? resolvedConfig.value.initialPage ?? 0,
    pageSize:
      routeSyncedState.pagination?.pageSize ??
      persistedState.pageSize ??
      resolvedConfig.value.pageSize ??
      unref(defaultPageSize),
  })
  const pageSize = computed(() => pagination.value.pageSize)

  const resolveRowId = (row: TData, index: number) => {
    const currentConfig = resolvedConfig.value
    const idKey = currentConfig.rowIdKey || 'id'
    const value = (row as Record<string, unknown>)[idKey]
    if (currentConfig.enableRowSelection && (value === null || value === undefined || value === '')) {
      warnMissingRowId()
    }

    return getRowIdFromKey(row, index, currentConfig.rowIdKey || 'id')
  }

  function resetPageIndex() {
    if (pagination.value.pageIndex !== 0) {
      pagination.value = { ...pagination.value, pageIndex: 0 }
    }
  }

  const table = useVueTable({
    get data() {
      return unref(data)
    },
    get columns() {
      return unref(columns)
    },
    state: {
      get sorting() {
        return sorting.value
      },
      get columnFilters() {
        return columnFilters.value
      },
      get columnVisibility() {
        return columnVisibility.value
      },
      get rowSelection() {
        return rowSelection.value
      },
      get pagination() {
        return pagination.value
      },
      get expanded() {
        return expanded.value
      },
      get globalFilter() {
        return globalFilter.value
      },
    },
    get enableRowSelection() {
      return resolvedConfig.value.enableRowSelection ?? false
    },
    get enableMultiRowSelection() {
      return resolvedConfig.value.enableMultiRowSelection ?? true
    },
    // This table is intentionally server-side-only: parent pages own fetching and pass
    // the current page rows back after receiving update:query.
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    get pageCount() {
      const value = unref(pageCount)
      return typeof value === 'number' ? value : undefined
    },
    get rowCount() {
      if (typeof unref(pageCount) === 'number') return undefined
      const value = unref(rowCount)
      return typeof value === 'number' ? value : undefined
    },
    getRowId: (row, index, parent) => {
      const currentConfig = resolvedConfig.value
      if (currentConfig.getRowId) {
        const id = currentConfig.getRowId(row, index, parent?.original)
        if (currentConfig.enableRowSelection && !id) warnMissingRowId()
        return id || `row-${index}`
      }

      return resolveRowId(row, index)
    },
    onSortingChange: (updaterOrValue) => {
      sorting.value = applyUpdater(sorting.value, updaterOrValue)
      resetPageIndex()
    },
    onColumnFiltersChange: (updaterOrValue) => {
      columnFilters.value = applyUpdater(columnFilters.value, updaterOrValue)
      resetPageIndex()
    },
    onColumnVisibilityChange: (updaterOrValue) => {
      columnVisibility.value = applyUpdater(columnVisibility.value, updaterOrValue)
    },
    onRowSelectionChange: (updaterOrValue) => {
      rowSelection.value = applyUpdater(rowSelection.value, updaterOrValue)
    },
    onPaginationChange: (updaterOrValue) => {
      pagination.value = applyUpdater(pagination.value, updaterOrValue)
    },
    onExpandedChange: (updaterOrValue) => {
      expanded.value = applyUpdater(expanded.value, updaterOrValue)
    },
    onGlobalFilterChange: (updaterOrValue) => {
      globalFilter.value = applyUpdater(globalFilter.value, updaterOrValue)
      resetPageIndex()
    },
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    get getSubRows() {
      return resolvedConfig.value.getSubRows
    },
  })

  const query = computed<DataTableQuery>(() => {
    const searchValue = globalFilter.value.trim()

    return {
      page: pagination.value.pageIndex + 1,
      pageSize: pagination.value.pageSize,
      search:
        searchValue && resolvedSearchColumnIds.value.length > 0
          ? {
              value: searchValue,
              columnIds: resolvedSearchColumnIds.value,
            }
          : undefined,
      sort: sorting.value.length > 0 ? sorting.value : undefined,
      filters:
        columnFilters.value.length > 0
          ? columnFilters.value.map((filter) => ({
              id: filter.id,
              value: toDataTableFilterValue(filter.value),
              operator: getFilterOperator(filter.value),
            }))
          : undefined,
    }
  })

  const emitQuery = useDebounceFn((nextQuery: DataTableQuery) => {
    onQueryChange?.(nextQuery)
  }, resolvedConfig.value.filterDebounce ?? 300)

  watch(
    query,
    (nextQuery) => {
      emitQuery(nextQuery)
    },
    { deep: true, immediate: resolvedConfig.value.emitInitialQuery ?? false },
  )

  watch(
    columnFilters,
    (filters) => {
      const currentConfig = resolvedConfig.value
      if (!currentConfig.autoExpandAll) return

      const shouldConsider =
        Array.isArray(currentConfig.autoExpandOnFilterIds) &&
        currentConfig.autoExpandOnFilterIds.length > 0
      const hasTargetFilter = shouldConsider
        ? filters.some(
            (filter) =>
              currentConfig.autoExpandOnFilterIds!.includes(filter.id) &&
              filter.value !== null &&
              filter.value !== undefined &&
              filter.value !== '',
          )
        : filters.length > 0

      expanded.value = hasTargetFilter ? true : {}
    },
    { deep: true, immediate: true },
  )

  // In server-side mode this only contains rows present in the current page data.
  const selectedRows = computed(() => table.getSelectedRowModel().rows.map((row) => row.original))
  const selectedIds = computed(() => getSelectedIds(rowSelection.value))
  const hasFilters = computed(() => columnFilters.value.length > 0 || Boolean(globalFilter.value))

  watch(
    resolvedSelectedRowIds,
    (ids) => {
      if (!ids) return

      const nextSelection = getRowSelectionFromIds(ids)
      if (areStringArraysEqual(getSelectedIds(nextSelection), selectedIds.value)) return

      rowSelection.value = nextSelection
    },
    { deep: true },
  )

  watch(
    selectedIds,
    (ids) => {
      const controlledIds = resolvedSelectedRowIds.value
      if (controlledIds && areStringArraysEqual(controlledIds, ids)) return

      onSelectionChange?.(ids)
    },
  )

  useDataTablePersistence({
    config: resolvedConfig,
    columnVisibility,
    pageSize,
    sorting,
  })

  useDataTableRouteSync({
    config: resolvedConfig,
    query,
    columnFilters,
    globalFilter,
    pagination,
    sorting,
  })

  function resetSelection() {
    rowSelection.value = {}
  }

  function resetFilters() {
    columnFilters.value = []
    sorting.value = []
    globalFilter.value = ''
    pagination.value = { ...pagination.value, pageIndex: 0 }
  }

  return {
    table,
    selectedRows,
    selectedIds,
    hasFilters,
    resetSelection,
    resetFilters,
    rowSelection,
    expanded,
    globalFilter,
    query,
  }
}
