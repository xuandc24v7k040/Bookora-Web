import type { ColumnDef } from '@tanstack/vue-table'

export interface UserTableRow {
  id: string
  name: string
  email: string
  role: string
  status: string
  createdAt: string
}

export const userColumns: ColumnDef<UserTableRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Tên',
    meta: { title: 'Tên' },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    meta: { title: 'Email' },
  },
  {
    accessorKey: 'role',
    header: 'Vai trò',
    meta: { title: 'Vai trò' },
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    meta: { title: 'Trạng thái' },
  },
  {
    accessorKey: 'createdAt',
    header: 'Ngày tạo',
    meta: { title: 'Ngày tạo' },
  },
]
