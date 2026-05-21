import type { ColumnDef } from '@tanstack/vue-table'

export interface SettingTableRow {
  id: string
  name: string
  type: string
  status: string
  updatedAt: string
}

export const settingColumns: ColumnDef<SettingTableRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Tên cấu hình',
    meta: { title: 'Tên cấu hình' },
  },
  {
    accessorKey: 'type',
    header: 'Loại',
    meta: { title: 'Loại' },
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    meta: { title: 'Trạng thái' },
  },
  {
    accessorKey: 'updatedAt',
    header: 'Cập nhật lần cuối',
    meta: { title: 'Cập nhật lần cuối' },
  },
]
