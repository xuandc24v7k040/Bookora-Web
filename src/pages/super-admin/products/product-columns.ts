import type { ColumnDef } from '@tanstack/vue-table'

export interface ProductTableRow {
  id: string
  name: string
  category: string
  price: string
  stock: number
  status: string
}

export const productColumns: ColumnDef<ProductTableRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Tên sản phẩm',
    meta: { title: 'Tên sản phẩm' },
  },
  {
    accessorKey: 'category',
    header: 'Danh mục',
    meta: { title: 'Danh mục' },
  },
  {
    accessorKey: 'price',
    header: 'Giá',
    meta: { title: 'Giá' },
  },
  {
    accessorKey: 'stock',
    header: 'Ton kho',
    meta: { title: 'Ton kho' },
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    meta: { title: 'Trạng thái' },
  },
]
