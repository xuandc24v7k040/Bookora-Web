import { h } from "vue";
import type { ColumnDef } from "@tanstack/vue-table";
import type { CouponResponseDto } from "@/api/generated/models";
import DataTableColumnHeader from "@/components/admin/table/DataTableColumnHeader.vue";
import { Badge } from "@/components/ui/badge";
import { formatVnd } from "@/features/products/utils/product-money";
import { formatDateTime } from "@/lib/date-format";
import { couponBenefit } from "../coupon-utils";

export const couponStatusLabels: Record<CouponResponseDto["status"], string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Tạm dừng",
  UPCOMING: "Chưa bắt đầu",
  EXPIRED: "Hết hạn",
  EXHAUSTED: "Hết lượt",
};
const couponStatusColors: Record<CouponResponseDto["status"], string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  INACTIVE: "border-slate-200 bg-slate-50 text-slate-600",
  UPCOMING: "border-blue-200 bg-blue-50 text-blue-700",
  EXPIRED: "border-red-200 bg-red-50 text-red-700",
  EXHAUSTED: "border-amber-200 bg-amber-50 text-amber-700",
};
export const couponColumns: ColumnDef<CouponResponseDto>[] = [
  {
    accessorKey: "code",
    header: ({ column }) =>
      h(DataTableColumnHeader<CouponResponseDto>, {
        column,
        title: "Mã",
        mode: { type: "sort" },
      }),
    cell: ({ row }) =>
      h(
        "p",
        { class: "max-w-44 truncate font-semibold", title: row.original.code },
        row.original.code,
      ),
    meta: { title: "Mã" },
  },
  {
    accessorKey: "name",
    size: 240,
    header: ({ column }) =>
      h(DataTableColumnHeader<CouponResponseDto>, {
        column,
        title: "Tên / Ưu đãi",
        mode: { type: "sort" },
      }),
    cell: ({ row }) =>
      h(
        "div",
        {
          class: "min-w-0 max-w-full space-y-1 overflow-hidden whitespace-normal break-words",
          title: row.original.description ?? row.original.name,
        },
        [
          h("p", { class: "font-medium" }, row.original.name),
          h(
            "p",
            { class: "text-xs leading-5 text-muted-foreground" },
            couponBenefit(row.original),
          ),
        ],
      ),
    meta: { title: "Ưu đãi" },
  },
  {
    accessorKey: "type",
    header: "Loại",
    cell: ({ row }) =>
      row.original.type === "ORDER" ? "Đơn hàng" : "Vận chuyển",
    enableSorting: false,
    meta: { title: "Loại" },
  },
  {
    accessorKey: "visibility",
    header: "Hiển thị",
    cell: ({ row }) =>
      row.original.visibility === "PUBLIC" ? "Công khai" : "Riêng tư",
    enableSorting: false,
    meta: { title: "Hiển thị" },
  },
  {
    accessorKey: "discountType",
    header: "Hình thức giảm",
    cell: ({ row }) =>
      row.original.discountType === "PERCENTAGE"
        ? "Phần trăm"
        : "Số tiền cố định",
    enableSorting: false,
    meta: { title: "Hình thức giảm" },
  },
  {
    accessorKey: "minOrderAmount",
    header: "Đơn tối thiểu",
    cell: ({ row }) => formatVnd(row.original.minOrderAmount ?? 0),
    enableSorting: false,
    meta: { title: "Đơn tối thiểu" },
  },
  {
    id: "usage",
    size: 190,
    header: "Lượt sử dụng",
    cell: ({ row }) =>
      h("div", { class: "min-w-0 max-w-full overflow-hidden whitespace-normal break-words text-xs leading-5 tabular-nums" }, [
        h("p", `Đã dùng: ${row.original.consumed} · Giữ: ${row.original.reserved}`),
        h("p", `Giới hạn: ${row.original.usageLimit ?? "Không giới hạn"}`),
        h("p", `Còn lại: ${row.original.remaining ?? "Không giới hạn"}`),
      ]),
    enableSorting: false,
    meta: { title: "Lượt sử dụng" },
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) =>
      h(
        Badge,
        { variant: "outline", class: couponStatusColors[row.original.status] },
        () => couponStatusLabels[row.original.status],
      ),
    enableSorting: false,
    meta: { title: "Trạng thái" },
  },
  {
    accessorKey: "startAt",
    header: ({ column }) =>
      h(DataTableColumnHeader<CouponResponseDto>, {
        column,
        title: "Bắt đầu",
        mode: { type: "sort" },
      }),
    cell: ({ row }) =>
      h(
        "span",
        { class: "whitespace-nowrap" },
        formatDateTime(row.original.startAt),
      ),
    meta: { title: "Bắt đầu" },
  },
  {
    accessorKey: "endAt",
    header: ({ column }) =>
      h(DataTableColumnHeader<CouponResponseDto>, {
        column,
        title: "Kết thúc",
        mode: { type: "sort" },
      }),
    cell: ({ row }) =>
      h(
        "span",
        { class: "whitespace-nowrap" },
        formatDateTime(row.original.endAt),
      ),
    meta: { title: "Kết thúc" },
  },
  {
    accessorKey: "createdAt",
    cell: ({ row }) => formatDateTime(row.original.createdAt),
    header: ({ column }) =>
      h(DataTableColumnHeader<CouponResponseDto>, {
        column,
        title: "Ngày tạo",
        mode: { type: "sort" },
      }),
    enableHiding: true,
    meta: { title: "Ngày tạo" },
  },
];
