import type { Column } from '@tanstack/vue-table'
import type { DataTableFilterOption, DataTableFilterValue, DateRangeValue } from './interface'

export function getColumnTitle<TData>(column: Column<TData, unknown>): string {
  const header = column.columnDef.header
  return column.columnDef.meta?.title || (typeof header === 'string' ? header : column.id)
}

export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (value === null || value === undefined || value === '') return []
  return [String(value)]
}

export function getOptionLabels(value: unknown, options: DataTableFilterOption[]): string {
  return toStringArray(value)
    .map((item) => options.find((option) => option.value === item)?.label)
    .filter((label): label is string => Boolean(label))
    .join(', ')
}

export function isDateRangeValue(value: unknown): value is DateRangeValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Partial<DateRangeValue>).start === 'string' &&
    typeof (value as Partial<DateRangeValue>).end === 'string'
  )
}

export function toDataTableFilterValue(value: unknown): DataTableFilterValue {
  if (isDateRangeValue(value)) return value
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  return String(value ?? '')
}

export function formatDateRangeValue(value: unknown, locale = 'vi-VN'): string | null {
  if (!isDateRangeValue(value)) return null

  const start = parseLocalDate(value.start)
  const end = parseLocalDate(value.end)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null

  return `${start.toLocaleDateString(locale)} - ${end.toLocaleDateString(locale)}`
}

export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)

  if (!year || !month || !day) return new Date(Number.NaN)

  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return new Date(Number.NaN)
  }

  return date
}
