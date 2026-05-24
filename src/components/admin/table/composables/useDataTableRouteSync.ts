import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/vue-table'
import { watch, type Ref } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import type {
  DataTableConfig,
  DataTableFilterQuery,
  DataTableFilterValue,
  DataTableQuery,
  DataTableRouteSyncConfig,
} from '../interface'
import { isDateRangeValue } from '../utils'

interface RouteSyncedTableState {
  columnFilters?: ColumnFiltersState
  globalFilter?: string
  pagination?: Partial<PaginationState>
  sorting?: SortingState
}

interface ResolvedRouteSyncConfig {
  keyPrefix: string
  page: boolean
  pageSize: boolean
  search: boolean
  sorting: boolean
  filters: boolean
  replace: boolean
}

interface UseDataTableRouteSyncProps<TData> {
  config: Ref<DataTableConfig<TData>>
  query: Ref<DataTableQuery>
  columnFilters: Ref<ColumnFiltersState>
  globalFilter: Ref<string>
  pagination: Ref<PaginationState>
  sorting: Ref<SortingState>
}

function resolveRouteSyncConfig<TData>(
  config: DataTableConfig<TData>,
): ResolvedRouteSyncConfig | null {
  if (!config.routeSync) return null

  const routeSync =
    typeof config.routeSync === 'object'
      ? config.routeSync
      : ({} satisfies DataTableRouteSyncConfig)
  const keyPrefix = routeSync.keyPrefix ?? config.tableId ?? 'dt'

  return {
    keyPrefix,
    page: routeSync.page ?? true,
    pageSize: routeSync.pageSize ?? true,
    search: routeSync.search ?? true,
    sorting: routeSync.sorting ?? true,
    filters: routeSync.filters ?? true,
    replace: routeSync.replace ?? true,
  }
}

function queryKey(config: ResolvedRouteSyncConfig, key: string): string {
  return `${config.keyPrefix}.${key}`
}

function getQueryString(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined
  return typeof value === 'string' ? value : undefined
}

function parsePositiveInteger(value: unknown): number | undefined {
  const parsed = Number(getQueryString(value))
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function parseJsonArray<TValue>(value: unknown): TValue[] | undefined {
  const rawValue = getQueryString(value)
  if (!rawValue) return undefined

  try {
    const parsed = JSON.parse(rawValue)
    return Array.isArray(parsed) ? (parsed as TValue[]) : undefined
  } catch {
    return undefined
  }
}

function isRouteFilterValue(value: unknown): value is DataTableFilterValue {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    Array.isArray(value) ||
    isDateRangeValue(value)
  )
}

function parseFilters(value: unknown): ColumnFiltersState | undefined {
  const filters = parseJsonArray<DataTableFilterQuery>(value)
  if (!filters) return undefined

  return filters
    .filter((filter) => filter.id && isRouteFilterValue(filter.value))
    .map((filter) => ({
      id: filter.id,
      value: filter.value,
    }))
}

function parseSorting(value: unknown): SortingState | undefined {
  const sorting = parseJsonArray<{ id: string; desc: boolean }>(value)
  if (!sorting) return undefined

  return sorting
    .filter((sort) => sort.id && typeof sort.desc === 'boolean')
    .map((sort) => ({
      id: sort.id,
      desc: sort.desc,
    }))
}

function getRouteSyncedStateFromQuery(
  routeQuery: Record<string, unknown>,
  config: ResolvedRouteSyncConfig,
): RouteSyncedTableState {
  const page = config.page ? parsePositiveInteger(routeQuery[queryKey(config, 'page')]) : undefined
  const pageSize = config.pageSize
    ? parsePositiveInteger(routeQuery[queryKey(config, 'pageSize')])
    : undefined
  const search = config.search ? getQueryString(routeQuery[queryKey(config, 'search')]) : undefined
  const sorting = config.sorting ? parseSorting(routeQuery[queryKey(config, 'sort')]) : undefined
  const filters = config.filters ? parseFilters(routeQuery[queryKey(config, 'filters')]) : undefined

  return {
    columnFilters: filters,
    globalFilter: search,
    pagination: {
      pageIndex: page ? page - 1 : undefined,
      pageSize,
    },
    sorting,
  }
}

export function getDataTableRouteSyncedState<TData>(
  config: DataTableConfig<TData>,
): RouteSyncedTableState {
  if (typeof window === 'undefined') return {}

  const routeSync = resolveRouteSyncConfig(config)
  if (!routeSync) return {}

  const searchParams = new URLSearchParams(window.location.search)
  const routeQuery = Object.fromEntries(searchParams.entries())

  return getRouteSyncedStateFromQuery(routeQuery, routeSync)
}

function queryToLocationQuery(
  currentQuery: LocationQueryRaw,
  tableQuery: DataTableQuery,
  config: ResolvedRouteSyncConfig,
): LocationQueryRaw {
  const nextQuery: LocationQueryRaw = { ...currentQuery }

  if (config.page) {
    nextQuery[queryKey(config, 'page')] = tableQuery.page > 1 ? String(tableQuery.page) : undefined
  }

  if (config.pageSize) {
    nextQuery[queryKey(config, 'pageSize')] = String(tableQuery.pageSize)
  }

  if (config.search) {
    nextQuery[queryKey(config, 'search')] = tableQuery.search?.value || undefined
  }

  if (config.sorting) {
    nextQuery[queryKey(config, 'sort')] = tableQuery.sort?.length
      ? JSON.stringify(tableQuery.sort)
      : undefined
  }

  if (config.filters) {
    nextQuery[queryKey(config, 'filters')] = tableQuery.filters?.length
      ? JSON.stringify(tableQuery.filters)
      : undefined
  }

  return nextQuery
}

export function useDataTableRouteSync<TData>({
  config,
  query,
  columnFilters,
  globalFilter,
  pagination,
  sorting,
}: UseDataTableRouteSyncProps<TData>): void {
  const route = useRoute()
  const router = useRouter()

  watch(
    query,
    async (nextQuery) => {
      const routeSync = resolveRouteSyncConfig(config.value)
      if (!routeSync) return

      const nextRouteQuery = queryToLocationQuery(route.query, nextQuery, routeSync)
      if (JSON.stringify(nextRouteQuery) === JSON.stringify(route.query)) return

      if (routeSync.replace) {
        await router.replace({ query: nextRouteQuery })
        return
      }

      await router.push({ query: nextRouteQuery })
    },
    { deep: true },
  )

  watch(
    () => route.query,
    (nextRouteQuery) => {
      const routeSync = resolveRouteSyncConfig(config.value)
      if (!routeSync) return

      const nextState = getRouteSyncedStateFromQuery(nextRouteQuery, routeSync)

      if (nextState.columnFilters) {
        columnFilters.value = nextState.columnFilters
      }
      if (typeof nextState.globalFilter === 'string') {
        globalFilter.value = nextState.globalFilter
      }
      if (nextState.pagination) {
        pagination.value = {
          ...pagination.value,
          ...nextState.pagination,
        }
      }
      if (nextState.sorting) {
        sorting.value = nextState.sorting
      }
    },
    { deep: true },
  )
}
