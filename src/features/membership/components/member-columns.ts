import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import type { MemberDto } from '@/api/generated/models'
import DataTableColumnHeader from '@/components/admin/table/DataTableColumnHeader.vue'
import { formatVnd } from '@/features/products/utils/product-money'
import { membershipDate } from '../membership-ui'
import MembershipTierBadge from './MembershipTierBadge.vue'
export const memberColumns: ColumnDef<MemberDto>[] = [
  {
    accessorKey: 'fullName',
    size: 360,
    header: ({ column }) =>
      h(DataTableColumnHeader<MemberDto>, {
        column,
        title: 'Khách hàng',
        mode: { type: 'sort' },
      }),
    cell: ({ row }) =>
      h('div', { class: 'min-w-0 max-w-64' }, [
        h(
          'p',
          { class: 'truncate font-medium', title: row.original.fullName ?? '' },
          row.original.fullName ?? 'Chưa cập nhật tên',
        ),
        h(
          'p',
          {
            class: 'truncate text-xs text-muted-foreground',
            title: row.original.email,
          },
          row.original.email,
        ),
      ]),
    meta: { title: 'Khách hàng' },
  },
  {
    accessorKey: 'currentTier',
    size: 140,
    header: 'Hạng',
    cell: ({ row }) =>
      h(MembershipTierBadge, { tier: row.original.currentTier }),
    enableSorting: false,
    meta: { title: 'Hạng' },
  },
  {
    accessorKey: 'lifetimeSpend',
    size: 150,
    header: ({ column }) =>
      h(DataTableColumnHeader<MemberDto>, {
        column,
        title: 'Chi tiêu hợp lệ',
        mode: { type: 'sort' },
      }),
    cell: ({ row }) =>
      h(
        'p',
        { class: 'whitespace-nowrap tabular-nums' },
        formatVnd(row.original.lifetimeSpend),
      ),
    meta: { title: 'Chi tiêu hợp lệ' },
  },
  {
    accessorKey: 'achievedAt',
    size: 180,
    header: ({ column }) =>
      h(DataTableColumnHeader<MemberDto>, {
        column,
        title: 'Ngày đạt hạng',
        mode: { type: 'sort' },
      }),
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-sm' },
        row.original.currentTier === 'BRONZE'
          ? 'Hạng mặc định'
          : membershipDate(row.original.achievedAt),
      ),
    meta: { title: 'Ngày đạt hạng' },
  },
]
