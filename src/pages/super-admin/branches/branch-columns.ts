import type { ColumnDef } from '@tanstack/vue-table'

export interface BranchTableRow {
  id: string
  name: string
  address: string
  status: string
  manager: string
}

export const branchColumns: ColumnDef<BranchTableRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Tên chi nhánh',
    meta: { title: 'Tên chi nhánh' },
  },
  {
    accessorKey: 'address',
    header: 'Địa chỉ',
    meta: { title: 'Địa chỉ' },
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    meta: { title: 'Trạng thái' },
  },
  {
    accessorKey: 'manager',
    header: 'Quản lý',
    meta: { title: 'Quản lý' },
  },
]
