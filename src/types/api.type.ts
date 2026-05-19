export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedMeta {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  items: T[]
  meta: PaginatedMeta
}

export interface ApiErrorBody {
  message: string | string[]
  error?: string
  statusCode?: number
}

export interface ApiError {
  message: string
  statusCode?: number
  details?: unknown
}
