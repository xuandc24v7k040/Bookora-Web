<template>
  <AdminPagePlaceholder
    title="Đơn hàng toàn hệ thống"
    description="Giám sát đơn hàng, thanh toán và trạng thái xử lý trên mọi chi nhánh."
    scope="super-admin"
  >
    <DataTable
      :columns="orderColumns"
      :data="orders"
      :page-count="1"
      :row-count="orders.length"
      :global-search="{ columnIds: ['code', 'customer'], placeholder: 'Tìm đơn hàng...' }"
      :config="{ rowIdKey: 'id' }"
    />
  </AdminPagePlaceholder>
</template>

<script setup lang="ts">
import DataTable from '@/components/admin/table/DataTable.vue'
import AdminPagePlaceholder from '@/components/AdminPagePlaceholder.vue'
import { orderColumns, type OrderTableRow } from './orders/order-columns'

const orders: OrderTableRow[] = [
  {
    id: 'order-1',
    code: 'BO-20260521-001',
    customer: 'Mai Thanh Lam',
    total: '680.000d',
    status: 'Đang xử lý',
    createdAt: '21/05/2026',
  },
  {
    id: 'order-2',
    code: 'BO-20260521-002',
    customer: 'Hoang Phuong',
    total: '245.000d',
    status: 'Đã thanh toán',
    createdAt: '21/05/2026',
  },
  {
    id: 'order-3',
    code: 'BO-20260520-018',
    customer: 'Nguyen Gia Han',
    total: '1.120.000d',
    status: 'Đã giao',
    createdAt: '20/05/2026',
  },
]
</script>
