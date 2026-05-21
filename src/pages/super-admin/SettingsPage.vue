<template>
  <AdminPagePlaceholder
    title="Cấu hình hệ thống"
    description="Thiết lập tham số vận hành, phân quyền và cấu hình chung cho Bookora."
    scope="super-admin"
  >
    <DataTable
      :columns="settingColumns"
      :data="settings"
      :page-count="1"
      :row-count="settings.length"
      :global-search="{ columnIds: ['name', 'type'], placeholder: 'Tìm cấu hình...' }"
      :config="{ rowIdKey: 'id' }"
    />
  </AdminPagePlaceholder>
</template>

<script setup lang="ts">
import DataTable from '@/components/admin/table/DataTable.vue'
import AdminPagePlaceholder from '@/components/AdminPagePlaceholder.vue'
import { settingColumns, type SettingTableRow } from './settings/setting-columns'

const settings: SettingTableRow[] = [
  {
    id: 'setting-1',
    name: 'Phân quyền Super Admin',
    type: 'Vai trò',
    status: 'Đang áp dụng',
    updatedAt: '21/05/2026',
  },
  {
    id: 'setting-2',
    name: 'Cấu hình tồn kho tối thiểu',
    type: 'Vận hành',
    status: 'Đang áp dụng',
    updatedAt: '20/05/2026',
  },
  {
    id: 'setting-3',
    name: 'Chính sách điểm thưởng',
    type: 'Ban hang',
    status: 'Bản nháp',
    updatedAt: '18/05/2026',
  },
]
</script>
