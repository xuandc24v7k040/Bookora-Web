import type {
  DataTableFilterQuery,
  DataTableQuery,
  DataTableServerParams,
} from './interface'

export type DataTableQueryAdapter<TParams> = (query: DataTableQuery) => TParams

interface DataTableServerParamOptions<TParams extends Record<string, unknown>> {
  map?: (params: DataTableServerParams, query: DataTableQuery) => TParams
  serializeFilters?: (filters: DataTableFilterQuery[]) => string
}

function defaultSerializeFilters(filters: DataTableFilterQuery[]): string {
  return JSON.stringify(filters)
}

export function toDataTableServerParams(query: DataTableQuery): DataTableServerParams {
  const primarySort = query.sort?.[0]

  return {
    page: query.page,
    limit: query.pageSize,
    search: query.search?.value,
    searchBy: query.search?.columnIds,
    sortBy: primarySort?.id,
    sortOrder: primarySort ? (primarySort.desc ? 'desc' : 'asc') : undefined,
    filters: query.filters?.length ? defaultSerializeFilters(query.filters) : undefined,
  }
}

export function createDataTableQueryAdapter<TParams extends Record<string, unknown>>(
  options: DataTableServerParamOptions<TParams>,
): DataTableQueryAdapter<TParams> {
  return (query) => {
    const params = toDataTableServerParams(query)

    if (query.filters?.length && options.serializeFilters) {
      params.filters = options.serializeFilters(query.filters)
    }

    return options.map ? options.map(params, query) : (params as unknown as TParams)
  }
}
