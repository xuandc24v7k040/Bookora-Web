<script setup lang="ts">
import { h, ref } from "vue";
import { Ellipsis, Eye, Pencil, Plus, RefreshCcw, Zap } from "@lucide/vue";
import type { ColumnDef } from "@tanstack/vue-table";
import { toast } from "vue-sonner";
import type {
  AdminFlashSalesListParams,
  FlashSaleControlDto,
  FlashSaleResponseDto,
  SaveFlashSaleDto,
} from "@/api/generated/models";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb.vue";
import DataTable from "@/components/admin/table/DataTable.vue";
import DataTableColumnHeader from "@/components/admin/table/DataTableColumnHeader.vue";
import type { DataTableQuery } from "@/components/admin/table/interface";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { formatDateTime } from "@/lib/date-format";
import { useAdminFlashSales } from "../api/flash-sale-api";
import {
  flashSaleError,
  flashStatusLabels,
  flashStatusColors,
} from "../flash-sale-utils";
import FlashSaleFormDialog from "../components/FlashSaleFormDialog.vue";
const params = ref<AdminFlashSalesListParams>({
  page: 1,
  limit: 10,
  sortBy: "createdAt",
  sortOrder: "desc",
});
const api = useAdminFlashSales(params),
  query = api.query;
const open = ref(false),
  readonly = ref(false),
  pending = ref(false),
  serverError = ref("");
const editing = ref<FlashSaleResponseDto | null>(null);
const control = ref<{
  sale: FlashSaleResponseDto;
  action: FlashSaleControlDto["action"];
} | null>(null);
const columns: ColumnDef<FlashSaleResponseDto>[] = [
  {
    accessorKey: "name",
    header: ({ column }) =>
      h(DataTableColumnHeader<FlashSaleResponseDto>, {
        column,
        title: "Chương trình",
        mode: { type: "sort" },
      }),
    cell: ({ row }) =>
      h(
        "span",
        {
          class: "block max-w-80 truncate font-medium",
          title: row.original.name,
        },
        row.original.name,
      ),
    meta: { title: "Chương trình" },
  },
  {
    accessorKey: "startAt",
    header: ({ column }) =>
      h(DataTableColumnHeader<FlashSaleResponseDto>, {
        column,
        title: "Thời gian áp dụng",
        mode: { type: "sort" },
      }),
    cell: ({ row }) =>
      h("div", { class: "space-y-1 text-xs" }, [
        h("p", `Từ: ${formatDateTime(row.original.startAt)}`),
        h(
          "p",
          { class: "text-muted-foreground" },
          `Đến: ${formatDateTime(row.original.endAt)}`,
        ),
      ]),
    meta: { title: "Thời gian" },
  },
  {
    accessorKey: "itemCount",
    header: "Sản phẩm tham gia",
    cell: ({ row }) => `${row.original.itemCount} biến thể`,
    enableSorting: false,
    meta: { title: "Sản phẩm" },
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) =>
      h(
        Badge,
        {
          variant: "outline",
          class: `rounded-full ${flashStatusColors[row.original.status]}`,
        },
        () => flashStatusLabels[row.original.status],
      ),
    enableSorting: false,
    meta: { title: "Trạng thái" },
  },
];
function handleQuery(value: DataTableQuery) {
  const sort = value.sort?.[0];
  const filter = value.filters?.find((f) => f.id === "status")?.value;
  const status = Array.isArray(filter) ? filter[0] : filter;
  params.value = {
    page: value.page,
    limit: value.pageSize,
    search: value.search?.value || undefined,
    status:
      typeof status === "string" && status in flashStatusLabels
        ? (status as FlashSaleResponseDto["status"])
        : undefined,
    sortBy:
      sort && ["name", "startAt", "endAt", "createdAt"].includes(sort.id)
        ? (sort.id as AdminFlashSalesListParams["sortBy"])
        : "createdAt",
    sortOrder: sort?.desc === false ? "asc" : "desc",
  };
}
async function show(sale: FlashSaleResponseDto | null, view = false) {
  if (pending.value) return;
  pending.value = true;
  serverError.value = "";
  try {
    editing.value = sale ? await api.detail(sale.id) : null;
    readonly.value = view;
    open.value = true;
  } catch (e) {
    toast.error(flashSaleError(e));
  } finally {
    pending.value = false;
  }
}
async function save(data: SaveFlashSaleDto, publish: boolean) {
  if (pending.value) return;
  pending.value = true;
  serverError.value = "";
  try {
    const saved = await api.save(data, editing.value?.id);
    editing.value = saved;
    if (publish) await api.control(saved.id, { action: "publish" });
    open.value = false;
    toast.success(
      publish ? "Đã công bố Flash Sale." : "Đã lưu bản nháp Flash Sale.",
    );
  } catch (e) {
    serverError.value = flashSaleError(e);
    toast.error(serverError.value);
  } finally {
    pending.value = false;
  }
}
async function applyControl() {
  if (!control.value || pending.value) return;
  pending.value = true;
  try {
    await api.control(control.value.sale.id, { action: control.value.action });
    control.value = null;
    toast.success("Đã cập nhật trạng thái Flash Sale.");
  } catch (e) {
    toast.error(flashSaleError(e));
  } finally {
    pending.value = false;
  }
}
</script>
<template>
  <div class="space-y-5">
    <AdminBreadcrumb
      group-label="Quản lý khuyến mãi"
      :group-to="{ name: 'super-admin-flash-sales' }"
      section-label="Flash Sale"
    />
    <header>
      <h1 class="flex items-center gap-2 text-2xl font-bold">
        <Zap class="size-6 text-foreground" />Quản lý Flash Sale
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Quản lý khung giờ vàng và suất ưu đãi sách toàn hệ thống.
      </p>
    </header>
    <DataTable
      :columns="columns"
      :data="query.data.value?.items ?? []"
      :page-count="query.data.value?.totalPages"
      :row-count="query.data.value?.totalItems"
      :is-loading="query.isFetching.value"
      :error="query.error.value"
      :global-search="{
        columnIds: ['name'],
        placeholder: 'Tìm chương trình...',
        title: 'Tìm kiếm',
      }"
      :filterable-columns="[
        {
          id: 'status',
          title: 'Trạng thái',
          multiple: false,
          options: Object.entries(flashStatusLabels).map(([value, label]) => ({
            value,
            label,
          })),
        },
      ]"
      :page-size-options="[10, 20, 50]"
      :config="{
        tableId: 'admin-flash-sales',
        rowIdKey: 'id',
        pageSize: 10,
        maxPageSize: 50,
        searchDebounce: 400,
        emitInitialQuery: true,
        stickyActionColumn: true,
        initialSorting: [{ id: 'startAt', desc: true }],
      }"
      @update:query="handleQuery"
      @retry="query.refetch()"
      ><template #toolbar-right
        ><Button
          size="sm"
          variant="outline"
          aria-label="Tải lại"
          @click="query.refetch()"
          ><RefreshCcw class="size-4" /></Button
        ><Button size="sm" :disabled="pending" @click="show(null)"
          ><Plus class="size-4" />Tạo Flash Sale</Button
        ></template
      ><template #row-actions="{ rowData }"
        ><DropdownMenu
          ><DropdownMenuTrigger as-child
            ><Button
              size="icon"
              variant="ghost"
              aria-label="Thao tác Flash Sale"
              ><Ellipsis class="size-4" /></Button></DropdownMenuTrigger
          ><DropdownMenuContent align="end"
            ><DropdownMenuItem :disabled="pending" @select="show(rowData, true)"
              ><Eye class="size-4" />Xem chi tiết</DropdownMenuItem
            ><DropdownMenuItem
              v-if="rowData.status === 'DRAFT'"
              :disabled="pending"
              @select="show(rowData)"
              ><Pencil class="size-4" />Chỉnh sửa</DropdownMenuItem
            ><DropdownMenuItem
              v-if="rowData.status === 'DRAFT'"
              :disabled="pending"
              @select="control = { sale: rowData, action: 'publish' }"
              ><Zap class="size-4" />Công bố ngay</DropdownMenuItem
            ><DropdownMenuItem
              v-if="['DRAFT', 'SCHEDULED'].includes(rowData.status)"
              :disabled="pending"
              class="text-destructive"
              @select="control = { sale: rowData, action: 'cancel' }"
              >Hủy chương trình</DropdownMenuItem
            ><DropdownMenuItem
              v-if="rowData.status === 'ACTIVE'"
              :disabled="pending"
              class="text-destructive"
              @select="control = { sale: rowData, action: 'stop' }"
              >Dừng sớm</DropdownMenuItem
            ></DropdownMenuContent
          ></DropdownMenu
        ></template
      ><template #empty
        ><p class="py-12 text-center text-muted-foreground">
          Chưa có Flash Sale phù hợp. Thử đổi từ khóa hoặc đặt lại bộ lọc.
        </p></template
      ><template #error
        ><p class="text-center">
          Không thể tải Flash Sale. Vui lòng thử lại.
        </p></template
      ></DataTable
    ><FlashSaleFormDialog
      v-model:open="open"
      :sale="editing"
      :readonly="readonly"
      :pending="pending"
      :server-error="serverError"
      @save="save"
    /><AlertDialog
      :open="control !== null"
      @update:open="
        (value) => {
          if (!value && !pending) control = null;
        }
      "
      ><AlertDialogContent
        ><AlertDialogHeader
          ><AlertDialogTitle>{{
            control?.action === "publish"
              ? "Công bố Flash Sale?"
              : control?.action === "stop"
                ? "Dừng sớm chương trình?"
                : "Hủy chương trình?"
          }}</AlertDialogTitle
          ><AlertDialogDescription>{{
            control?.action === "publish"
              ? "Hệ thống kiểm tra lại giá, tồn kho và lịch trùng. Giá VND sẽ được khóa sau công bố."
              : "Chương trình ngừng nhận ưu đãi mới. Đơn hàng và suất đã giữ hợp lệ tiếp tục theo thời hạn thanh toán."
          }}</AlertDialogDescription></AlertDialogHeader
        ><AlertDialogFooter
          ><AlertDialogCancel :disabled="pending">Quay lại</AlertDialogCancel
          ><Button :disabled="pending" @click="applyControl">{{
            pending ? "Đang xử lý..." : "Xác nhận"
          }}</Button></AlertDialogFooter
        ></AlertDialogContent
      ></AlertDialog
    >
  </div>
</template>
