<script setup lang="ts">
import { computed, ref } from "vue";
import { Ellipsis, Pencil, Plus, Power, RefreshCcw, Ticket } from "@lucide/vue";
import { toast } from "vue-sonner";
import type {
  AdminCouponsListParams,
  CouponResponseDto,
  SaveCouponDto,
} from "@/api/generated/models";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb.vue";
import DataTable from "@/components/admin/table/DataTable.vue";
import type {
  DataTableFilterableColumn,
  DataTableQuery,
} from "@/components/admin/table/interface";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CouponFormDialog from "../components/CouponFormDialog.vue";
import {
  couponColumns,
  couponStatusLabels,
} from "../components/coupon-columns";
import { couponErrorMessage } from "../coupon-utils";
import { useAdminCoupons } from "../use-admin-coupons";

const params = ref<AdminCouponsListParams>({
  page: 1,
  limit: 10,
  sortBy: "createdAt",
  sortOrder: "desc",
});
const { query, save, active, detail } = useAdminCoupons(params);
const formOpen = ref(false);
const editing = ref<CouponResponseDto | null>(null);
const loadingDetail = ref(false);
const serverError = ref("");
const activeTarget = ref<CouponResponseDto | null>(null);
const activeOpen = computed({
  get: () => activeTarget.value !== null,
  set: (value: boolean) => {
    if (!value && !active.isPending.value) activeTarget.value = null;
  },
});
const filters: DataTableFilterableColumn[] = [
  {
    id: "type",
    title: "Loại voucher",
    multiple: false,
    options: [
      { label: "Đơn hàng", value: "ORDER" },
      { label: "Vận chuyển", value: "SHIPPING" },
    ],
  },
  {
    id: "visibility",
    title: "Hiển thị",
    multiple: false,
    options: [
      { label: "Công khai", value: "PUBLIC" },
      { label: "Riêng tư", value: "PRIVATE" },
    ],
  },
  {
    id: "discountType",
    title: "Hình thức giảm",
    multiple: false,
    options: [
      { label: "Số tiền cố định", value: "FIXED_AMOUNT" },
      { label: "Phần trăm", value: "PERCENTAGE" },
    ],
  },
  {
    id: "status",
    title: "Trạng thái",
    multiple: false,
    options: Object.entries(couponStatusLabels).map(([value, label]) => ({
      value,
      label,
    })),
  },
];
function handleQuery(value: DataTableQuery): void {
  const next: AdminCouponsListParams = {
    page: value.page,
    limit: value.pageSize,
    search: value.search?.value || undefined,
  };
  for (const filter of value.filters ?? []) {
    const scalar = Array.isArray(filter.value) ? filter.value[0] : filter.value;
    if (typeof scalar !== "string") continue;
    if (filter.id === "type" && (scalar === "ORDER" || scalar === "SHIPPING"))
      next.type = scalar;
    if (
      filter.id === "visibility" &&
      (scalar === "PUBLIC" || scalar === "PRIVATE")
    )
      next.visibility = scalar;
    if (
      filter.id === "discountType" &&
      (scalar === "FIXED_AMOUNT" || scalar === "PERCENTAGE")
    )
      next.discountType = scalar;
    if (filter.id === "status" && scalar in couponStatusLabels)
      next.status = scalar as NonNullable<AdminCouponsListParams["status"]>;
  }
  const sorting = value.sort?.[0];
  const allowed = ["code", "name", "startAt", "endAt", "createdAt"] as const;
  next.sortBy = allowed.includes(sorting?.id as (typeof allowed)[number])
    ? (sorting!.id as (typeof allowed)[number])
    : "createdAt";
  next.sortOrder = sorting?.desc === false ? "asc" : "desc";
  params.value = next;
}
async function edit(row: CouponResponseDto): Promise<void> {
  loadingDetail.value = true;
  try {
    editing.value = await detail(row.id);
    serverError.value = "";
    formOpen.value = true;
  } catch (error: unknown) {
    toast.error(couponErrorMessage(error));
  } finally {
    loadingDetail.value = false;
  }
}
function create(): void {
  editing.value = null;
  serverError.value = "";
  formOpen.value = true;
}
async function submit(data: SaveCouponDto): Promise<void> {
  if (save.isPending.value) return;
  try {
    await save.mutateAsync({ id: editing.value?.id, data });
    formOpen.value = false;
    toast.success("Đã lưu khuyến mãi.");
  } catch (error: unknown) {
    serverError.value = couponErrorMessage(error);
    toast.error(serverError.value);
  }
}
async function toggleActive(): Promise<void> {
  const row = activeTarget.value;
  if (!row || active.isPending.value) return;
  try {
    await active.mutateAsync({ id: row.id, isActive: !row.isActive });
    activeTarget.value = null;
    toast.success("Đã cập nhật trạng thái khuyến mãi.");
  } catch (error: unknown) {
    toast.error(couponErrorMessage(error));
  }
}
</script>

<template>
  <section class="min-w-0 space-y-6">
    <AdminBreadcrumb
      group-label="Quản lý khuyến mãi"
      :group-to="{ name: 'super-admin-coupons' }"
      section-label="Mã khuyến mãi"
    />
    <header>
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
        Mã khuyến mãi
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Quản lý voucher đơn hàng và vận chuyển trên toàn hệ thống Bookora.
      </p>
    </header>
    <DataTable
      :columns="couponColumns"
      :data="query.data.value?.items ?? []"
      :page-count="query.data.value?.totalPages"
      :row-count="query.data.value?.totalItems"
      :is-loading="query.isFetching.value"
      :error="query.error.value"
      :global-search="{
        columnIds: ['code', 'name'],
        placeholder: 'Tìm mã hoặc tên ưu đãi...',
        title: 'Tìm kiếm',
      }"
      :filterable-columns="filters"
      :page-size-options="[10, 20, 50]"
      :config="{
        tableId: 'admin-coupons',
        rowIdKey: 'id',
        pageSize: 10,
        maxPageSize: 50,
        searchDebounce: 400,
        emitInitialQuery: true,
        enableColumnVisibility: true,
        stickyActionColumn: true,
        initialSorting: [{ id: 'createdAt', desc: true }],
        initialColumnVisibility: {
          type: false,
          visibility: false,
          discountType: false,
          createdAt: false,
        },
        routeSync: {
          mode: 'compact',
          page: true,
          pageSize: true,
          search: true,
          sorting: true,
          filters: true,
          filterIds: ['type', 'visibility', 'discountType', 'status'],
          stringFilterIds: ['type', 'visibility', 'discountType', 'status'],
          replace: true,
        },
      }"
      @update:query="handleQuery"
      @retry="query.refetch()"
    >
      <template #toolbar-right
        ><Button size="sm" variant="outline" @click="query.refetch()"
          ><RefreshCcw class="size-4" />Tải lại</Button
        ><Button size="sm" @click="create"
          ><Plus class="size-4" />Tạo mã</Button
        ></template
      >
      <template #row-actions="{ rowData }">
        <DropdownMenu>
          <DropdownMenuTrigger as-child
            ><Button
              size="icon-sm"
              variant="outline"
              :aria-label="`Thao tác mã ${rowData.code}`"
              ><Ellipsis class="size-4" /></Button
          ></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem :disabled="loadingDetail" @select="edit(rowData)"
              ><Pencil class="size-4" />Chỉnh sửa</DropdownMenuItem
            >
            <DropdownMenuItem
              :disabled="active.isPending.value"
              @select="activeTarget = rowData"
              ><Power class="size-4" />{{
                rowData.isActive ? "Tạm dừng mã" : "Kích hoạt mã"
              }}</DropdownMenuItem
            >
          </DropdownMenuContent>
        </DropdownMenu>
      </template>
      <template #empty
        ><div class="py-12 text-center text-muted-foreground">
          <Ticket class="mx-auto mb-3 size-9" />
          <p>Không có mã giảm giá phù hợp.</p>
          <p class="mt-1 text-sm">Thử thay đổi từ khóa hoặc đặt lại bộ lọc.</p>
        </div></template
      >
      <template #error
        ><p class="text-center">
          Không thể tải khuyến mãi. Vui lòng thử lại.
        </p></template
      >
    </DataTable>
    <CouponFormDialog
      v-model:open="formOpen"
      :coupon="editing"
      :pending="save.isPending.value"
      :server-error="serverError"
      @save="submit"
      @clear-error="serverError = ''"
    />
    <AlertDialog v-model:open="activeOpen"
      ><AlertDialogContent
        ><AlertDialogHeader
          ><AlertDialogTitle
            >{{ activeTarget?.isActive ? "Tạm dừng" : "Kích hoạt" }} mã giảm
            giá?</AlertDialogTitle
          ><AlertDialogDescription
            >Mã {{ activeTarget?.code }} sẽ
            {{
              activeTarget?.isActive
                ? "không áp dụng cho đơn hàng mới"
                : "được áp dụng nếu đủ điều kiện"
            }}. Ưu đãi của đơn đã chốt được giữ nguyên.</AlertDialogDescription
          ></AlertDialogHeader
        ><AlertDialogFooter
          ><AlertDialogCancel :disabled="active.isPending.value"
            >Hủy bỏ</AlertDialogCancel
          ><Button
            :disabled="active.isPending.value"
            @click="toggleActive"
            >{{
              active.isPending.value ? "Đang cập nhật..." : "Xác nhận"
            }}</Button
          ></AlertDialogFooter
        ></AlertDialogContent
      ></AlertDialog
    >
  </section>
</template>
