<template>
  <AdminPagePlaceholder
    title="Sản phẩm"
    description="Quản trị dữ liệu sách, thông tin hiển thị và trạng thái kinh doanh."
    scope="super-admin"
  >
    <DataTable
      :columns="productColumns"
      :data="products"
      :page-count="1"
      :row-count="products.length"
      :global-search="{ columnIds: ['name', 'category'], placeholder: 'Tìm sản phẩm...' }"
      :config="{ rowIdKey: 'id' }"
    />
  </AdminPagePlaceholder>
</template>

<script setup lang="ts">
import DataTable from '@/components/admin/table/DataTable.vue'
import AdminPagePlaceholder from '@/components/AdminPagePlaceholder.vue'
import { productColumns, type ProductTableRow } from './products/product-columns'

const products: ProductTableRow[] = [
  {
    id: 'product-1',
    name: 'Clean Code',
    category: 'Lập trình',
    price: '320.000d',
    stock: 42,
    status: 'Đang bán',
  },
  {
    id: 'product-2',
    name: 'Atomic Habits',
    category: 'Kỹ năng',
    price: '180.000d',
    stock: 16,
    status: 'Đang bán',
  },
  {
    id: 'product-3',
    name: 'Designing Data-Intensive Applications',
    category: 'Công nghệ',
    price: '540.000d',
    stock: 5,
    status: 'Sắp hết hàng',
  },
]
</script>
