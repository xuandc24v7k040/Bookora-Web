<template>
  <AdminPagePlaceholder
    title="Người dùng"
    description="Quản lý tài khoản khách hàng, nhân sự và quyền truy cập cấp hệ thống."
    scope="super-admin"
  >
    <DataTable
      :columns="userColumns"
      :data="users"
      :page-count="1"
      :row-count="users.length"
      :global-search="{ columnIds: ['name', 'email'], placeholder: 'Tìm người dùng...' }"
      :config="{ rowIdKey: 'id' }"
    />
  </AdminPagePlaceholder>
</template>

<script setup lang="ts">
import DataTable from '@/components/admin/table/DataTable.vue'
import AdminPagePlaceholder from '@/components/AdminPagePlaceholder.vue'
import { userColumns, type UserTableRow } from './users/user-columns'

const users: UserTableRow[] = [
  {
    id: 'user-1',
    name: 'Nguyen Minh Anh',
    email: 'minhanh@bookora.test',
    role: 'Super Admin',
    status: 'Đang hoạt động',
    createdAt: '20/05/2026',
  },
  {
    id: 'user-2',
    name: 'Tran Bao Chau',
    email: 'baochau@bookora.test',
    role: 'Branch Admin',
    status: 'Đang hoạt động',
    createdAt: '18/05/2026',
  },
  {
    id: 'user-3',
    name: 'Le Quoc Huy',
    email: 'quochuy@bookora.test',
    role: 'Nhan vien',
    status: 'Tạm khóa',
    createdAt: '12/05/2026',
  },
]
</script>
