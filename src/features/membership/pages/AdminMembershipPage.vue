<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Crown, Eye, RefreshCcw, Settings2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import axios from 'axios'
import type {
  AdminMembershipMembersParams,
  UpdateMembershipThresholdsDto,
} from '@/api/generated/models'
import AdminBreadcrumb from '@/components/admin/AdminBreadcrumb.vue'
import DataTable from '@/components/admin/table/DataTable.vue'
import type {
  DataTableFilterableColumn,
  DataTableQuery,
} from '@/components/admin/table/interface'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatVnd } from '@/features/products/utils/product-money'
import { useAdminMembership } from '../use-admin-membership'
import { tierAccents, tierLabels, type MembershipTier } from '../membership-ui'
import { memberColumns } from '../components/member-columns'
import MemberDetailDialog from '../components/MemberDetailDialog.vue'
import MembershipThresholdDialog from '../components/MembershipThresholdDialog.vue'
import '../membership.css'

const params = ref<AdminMembershipMembersParams>({
  page: 1,
  limit: 10,
  sortBy: 'lifetimeSpend',
  sortOrder: 'desc',
})
const { members, config, save } = useAdminMembership(params)
const editing = ref(false),
  selected = ref<string | null>(null),
  serverError = ref('')
const thresholds = computed<Array<{ tier: MembershipTier; value: number }>>(
  () =>
    config.data.value
      ? [
          { tier: 'BRONZE', value: 0 },
          { tier: 'SILVER', value: config.data.value.silver },
          { tier: 'GOLD', value: config.data.value.gold },
          { tier: 'DIAMOND', value: config.data.value.diamond },
        ]
      : [],
)
const filters: DataTableFilterableColumn[] = [
  {
    id: 'currentTier',
    title: 'Hạng thành viên',
    multiple: false,
    options: Object.entries(tierLabels).map(([value, label]) => ({
      value,
      label,
    })),
  },
]
watch(
  () => config.data.value?.pending,
  (pending, previous) => {
    if (previous && pending === false) {
      void members.refetch()
      toast.success('Đã hoàn tất xét lại hạng thành viên.')
    }
  },
)
function handleQuery(query: DataTableQuery) {
  const raw = query.filters?.find(
    (filter) => filter.id === 'currentTier',
  )?.value
  const tier = Array.isArray(raw) ? raw[0] : raw
  const sort = query.sort?.[0]
  params.value = {
    page: query.page,
    limit: query.pageSize,
    search: query.search?.value || undefined,
    tier:
      typeof tier === 'string' && tier in tierLabels
        ? (tier as MembershipTier)
        : undefined,
    sortBy:
      sort?.id === 'fullName' || sort?.id === 'achievedAt'
        ? sort.id
        : 'lifetimeSpend',
    sortOrder: sort?.desc === false ? 'asc' : 'desc',
  }
}
async function submit(data: UpdateMembershipThresholdsDto) {
  if (save.isPending.value) return
  try {
    const response = await save.mutateAsync(data)
    editing.value = false
    toast.success(
      response.data.pending
        ? 'Đã lưu ngưỡng. Đang xét lại hạng thành viên.'
        : 'Đã lưu cấu hình.',
    )
  } catch (error: unknown) {
    const body: unknown = axios.isAxiosError(error)
      ? error.response?.data
      : null
    serverError.value =
      body &&
      typeof body === 'object' &&
      'message' in body &&
      typeof body.message === 'string'
        ? body.message
        : 'Không thể lưu cấu hình. Vui lòng thử lại.'
    toast.error(serverError.value)
    void config.refetch()
  }
}
function openThresholds() {
  serverError.value = ''
  editing.value = true
}
function refresh() {
  void members.refetch()
  void config.refetch()
}
</script>
<template>
  <section class="membership-admin min-w-0 space-y-6">
    <AdminBreadcrumb
      group-label="Quản lý khách hàng"
      :group-to="{ name: 'super-admin-membership' }"
      section-label="Quản lý thành viên"
    />
    <header>
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
        Quản lý thành viên
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Tích lũy toàn hệ thống. Hạng đã đạt được giữ vĩnh viễn.
      </p>
    </header>
    <section class="min-w-0 rounded-xl border bg-card p-4 sm:p-5">
      <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 class="flex items-center gap-2 font-semibold">
          <Crown class="size-5" />Ngưỡng hạng thành viên
        </h2>
        <Button
          size="sm"
          variant="outline"
          class="cursor-pointer"
          :disabled="
            !config.data.value ||
            config.data.value.pending ||
            config.isFetching.value
          "
          @click="openThresholds"
          ><Settings2 class="size-4" />Cấu hình ngưỡng</Button
        >
      </header>
      <div
        v-if="config.isPending.value"
        class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Skeleton v-for="n in 4" :key="n" class="h-20 w-full" />
      </div>
      <div
        v-else-if="config.isError.value"
        role="alert"
        class="space-y-2 text-sm"
      >
        <p>Không thể tải cấu hình.</p>
        <Button
          variant="outline"
          class="cursor-pointer"
          @click="config.refetch()"
          >Thử lại</Button
        >
      </div>
      <div v-else class="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="tier in thresholds"
          :key="tier.tier"
          class="min-w-0 rounded-lg border p-4"
          :class="tierAccents[tier.tier]"
        >
          <p class="text-sm font-medium">{{ tierLabels[tier.tier] }}</p>
          <p class="mt-2 break-words text-lg font-semibold tabular-nums">
            {{ formatVnd(tier.value) }}
          </p>
        </div>
      </div>
      <p
        v-if="config.data.value?.pending"
        role="status"
        class="mt-3 text-sm text-muted-foreground"
      >
        Đã lưu cấu hình. Đang xét lại hạng theo từng lô; thành viên chỉ được
        nâng hạng.
      </p>
    </section>
    <DataTable
      :columns="memberColumns"
      :data="members.isError.value ? [] : (members.data.value?.items ?? [])"
      :page-count="members.data.value?.totalPages"
      :row-count="members.data.value?.totalItems"
      :is-loading="members.isFetching.value"
      :error="members.error.value"
      :global-search="{
        columnIds: ['fullName'],
        placeholder: 'Tìm tên hoặc email khách hàng...',
        title: 'Tìm kiếm',
      }"
      :filterable-columns="filters"
      :page-size-options="[10, 20, 50]"
      :config="{
        tableId: 'admin-membership',
        rowIdKey: 'userId',
        pageSize: 10,
        maxPageSize: 50,
        searchDebounce: 400,
        emitInitialQuery: true,
        stickyActionColumn: true,
        initialSorting: [{ id: 'lifetimeSpend', desc: true }],
        routeSync: {
          mode: 'compact',
          page: true,
          pageSize: true,
          search: true,
          sorting: true,
          filters: true,
          filterIds: ['currentTier'],
          stringFilterIds: ['currentTier'],
          replace: true,
        },
      }"
      @update:query="handleQuery"
      @retry="members.refetch()"
    >
      <template #toolbar-right
        ><Button
          size="sm"
          variant="outline"
          class="cursor-pointer"
          @click="refresh"
          ><RefreshCcw class="size-4" />Tải lại</Button
        ></template
      >
      <template #row-actions="{ rowData }"
        ><Button
          size="icon-sm"
          variant="outline"
          class="cursor-pointer"
          :aria-label="`Xem chi tiết thành viên ${rowData.fullName ?? rowData.email}`"
          title="Xem chi tiết thành viên"
          @click="selected = rowData.userId"
          ><Eye class="size-4" aria-hidden="true" /></Button
      ></template>
      <template #empty
        ><p class="py-10 text-center text-muted-foreground">
          Không có thành viên phù hợp. Thử đổi từ khóa hoặc đặt lại bộ lọc.
        </p></template
      >
      <template #error
        ><p class="text-center">
          Không thể tải danh sách thành viên. Vui lòng thử lại.
        </p></template
      >
    </DataTable>
    <MembershipThresholdDialog
      v-if="config.data.value"
      v-model:open="editing"
      :config="config.data.value"
      :pending="save.isPending.value"
      :error="serverError"
      @save="submit"
      @clear-error="serverError = ''"
    />
    <MemberDetailDialog :user-id="selected" @close="selected = null" />
  </section>
</template>
