<script setup lang="ts">
import { h, ref } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import type { NotificationItemDto, NotificationsListParams } from '@/api/generated/models';
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb.vue';
import DataTable from '@/components/admin/table/DataTable.vue';
import DataTableColumnHeader from '@/components/admin/table/DataTableColumnHeader.vue';
import type { DataTableFilterableColumn, DataTableQuery } from '@/components/admin/table/interface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBranchStore } from '@/stores/branch.store';
import { useNotificationQueries, notificationTarget } from '../notifications-api';
import { notificationTime } from '../notification-presentation';

const branches = useBranchStore(), router = useRouter();
const params = ref<NotificationsListParams>({ page: 1, limit: 10, sort: 'newest' });
const state = useNotificationQueries(params);
const notificationTypeLabels: Readonly<Record<string, string>> = {
  ORDER_NEW_COD: 'Đơn hàng mới (COD)',
  ORDER_NEW_PAID: 'Đơn hàng đã thanh toán',
  ORDER_RECEIVED: 'Khách đã nhận hàng',
  ORDER_CUSTOMER_CANCELLED: 'Khách hủy đơn hàng',
};
const filterableColumns: DataTableFilterableColumn[] = [{
  id: 'notificationView', title: 'Thông báo', multiple: false, operator: 'equals',
  options: [{ value: 'all', label: 'Tất cả' }, { value: 'unread', label: 'Chưa đọc' }, { value: 'order', label: 'Đơn hàng' }],
}];
const columns: ColumnDef<NotificationItemDto>[] = [
  { id: 'notificationView', accessorFn: () => 'order', enableSorting: false, enableHiding: false },
  { accessorKey: 'title', header: 'Thông báo', enableSorting: false,
    cell: ({ row }) => h('div', { class: 'min-w-64 max-w-xl whitespace-normal py-2' }, [
      h('p', { class: 'font-semibold' }, `${row.original.readAt ? '' : '● '}${row.original.title}`),
      h('p', { class: 'mt-1 text-sm text-muted-foreground' }, row.original.content),
    ]) },
  { accessorKey: 'createdAt', meta: { title: 'Thời gian' }, header: ({ column }) => h(DataTableColumnHeader<NotificationItemDto>, { column, title: 'Thời gian', mode: { type: 'sort' } }), cell: ({ row }) => h('time', {
    datetime: row.original.createdAt, title: new Date(row.original.createdAt).toLocaleString('vi-VN'),
    class: 'whitespace-nowrap text-muted-foreground',
  }, notificationTime(row.original.createdAt)) },
  { accessorKey: 'type', header: 'Loại thông báo', meta: { title: 'Loại thông báo' }, enableSorting: false,
    cell: ({ row }) => h(Badge, { variant: 'outline', class: 'whitespace-nowrap' },
      () => notificationTypeLabels[row.original.type] ?? 'Thông báo khác') },
  { id: 'actions', header: '', meta: { title: 'Thao tác' }, enableSorting: false, cell: ({ row }) => h(Button, {
    variant: 'ghost', size: 'sm', class: 'cursor-pointer', onClick: () => select(row.original),
  }, () => 'Xem chi tiết →') },
];
function handleQuery(value: DataTableQuery) {
  const view = value.filters?.find((filter) => filter.id === 'notificationView')?.value;
  params.value = { page: value.page, limit: value.pageSize, search: value.search?.value || undefined,
    sort: value.sort?.[0]?.desc === false ? 'oldest' : 'newest',
    unreadOnly: view === 'unread' || undefined, category: view === 'order' ? 'ORDER' : undefined };
}
async function markAll() {
  try { await state.mark.mutateAsync(undefined); }
  catch { toast.error('Không thể đánh dấu đã đọc. Vui lòng thử lại.'); }
}
async function select(item: NotificationItemDto) {
  try {
    if (!item.readAt) await state.mark.mutateAsync(item.id);
    const target = notificationTarget(item, true);
    if (target) await router.push(target);
    else toast.info('Đơn hàng liên kết hiện không còn khả dụng.');
  } catch { toast.error('Không thể mở thông báo. Vui lòng thử lại.'); }
}
</script>

<template>
  <section v-if="state.isOperations.value" class="notification-theme notification-admin min-w-0 space-y-5">
    <AdminBreadcrumb group-label="Quản trị" :group-to="{ name: 'branch-admin-dashboard' }" section-label="Thông báo" />
    <div><h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Thông báo</h1><p class="mt-1 text-sm text-muted-foreground">Cập nhật vận hành đơn hàng tại {{ branches.scopeLabel }}.</p></div>
    <DataTable :key="state.branchId.value ?? 'none'" :columns="columns" :data="state.items.value"
      :page-count="state.list.data.value?.totalPages" :row-count="state.list.data.value?.totalItems"
      :is-loading="state.list.isFetching.value" :error="state.list.error.value"
      :global-search="{ columnIds: ['title'], placeholder: 'Tìm theo mã đơn hoặc nội dung thông báo...' }"
      :filterable-columns="filterableColumns"
      :page-size-options="[10, 20, 50]" :config="{ tableId: 'branch-notifications', getRowId: (row) => row.id, pageSize: 10, maxPageSize: 50, emitInitialQuery: true, initialSorting: [{ id: 'createdAt', desc: true }], initialFilters: [{ id: 'notificationView', value: 'all' }], initialColumnVisibility: { notificationView: false }, enableRowClick: true }"
      @update:query="handleQuery" @row-click="select" @retry="state.retry()">
      <template #toolbar-right><Button size="sm" class="cursor-pointer" :disabled="!state.unread.value || state.mark.isPending.value" @click="markAll">Đánh dấu tất cả đã đọc</Button></template>
      <template #error><p>Không thể tải thông báo. Vui lòng kiểm tra quyền chi nhánh và thử lại.</p></template>
    </DataTable>
  </section>
  <p v-else role="alert">Bạn không có quyền xem thông báo vận hành tại chi nhánh này.</p>
</template>
