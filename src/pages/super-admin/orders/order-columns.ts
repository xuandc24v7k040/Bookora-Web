import type { ColumnDef } from '@tanstack/vue-table'

export interface OrderTableRow {
  id: string
  code: string
  customer: string
  total: string
  status: string
  createdAt: string
}

export const orderColumns: ColumnDef<OrderTableRow, unknown>[] = [
  {
    accessorKey: 'code',
    header: 'Mã đơn',
    meta: { title: 'Mã đơn' },
  },
  {
    accessorKey: 'customer',
    header: 'Khách hàng',
    meta: { title: 'Khách hàng' },
  },
  {
    accessorKey: 'total',
    header: 'Tổng tiền',
    meta: { title: 'Tổng tiền' },
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
