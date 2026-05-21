<template>
  <AdminPagePlaceholder
    title="Chi nhánh"
    description="Theo dõi danh sách chi nhánh, trạng thái hoạt động và cấu hình vận hành."
    scope="super-admin"
  >
    <DataTable
      :columns="branchColumns"
      :data="branches"
      :page-count="1"
      :row-count="branches.length"
      :global-search="{ columnIds: ['name', 'address', 'manager'], placeholder: 'Tìm chi nhánh...' }"
      :config="{ rowIdKey: 'id' }"
    />
  </AdminPagePlaceholder>
</template>

<script setup lang="ts">
import DataTable from '@/components/admin/table/DataTable.vue'
import AdminPagePlaceholder from '@/components/AdminPagePlaceholder.vue'
import { branchColumns, type BranchTableRow } from './branches/branch-columns'

const branches: BranchTableRow[] = [
  {
    id: 'branch-1',
    name: 'Bookora Can Tho',
    address: 'Ninh Kieu, Can Tho',
    status: 'Đang hoạt động',
    manager: 'Tran Bao Chau',
  },
  {
    id: 'branch-2',
    name: 'Bookora Hau Giang',
    address: 'Vi Thanh, Hau Giang',
    status: 'Đang hoạt động',
    manager: 'Pham Gia Bao',
  },
  {
    id: 'branch-3',
    name: 'Bookora Online Hub',
    address: 'Kho trung tam',
    status: 'Bảo trì',
    manager: 'Nguyen Minh Anh',
  },
]
</script>
