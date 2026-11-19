import axios from "axios";
import type { FlashSaleResponseDto } from "@/api/generated/models";
export const flashStatusLabels: Record<FlashSaleResponseDto["status"], string> =
  {
    DRAFT: "Bản nháp",
    SCHEDULED: "Sắp diễn ra",
    ACTIVE: "Đang diễn ra",
    ENDED: "Đã kết thúc",
    CANCELLED: "Đã hủy",
    STOPPED_EARLY: "Dừng sớm",
  };
export const flashStatusColors: Record<FlashSaleResponseDto["status"], string> =
  {
    DRAFT: "border-slate-200 bg-slate-50 text-slate-700",
    SCHEDULED: "border-amber-200 bg-amber-50 text-amber-800",
    ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
    ENDED: "border-slate-200 bg-slate-50 text-slate-600",
    CANCELLED: "border-red-200 bg-red-50 text-red-700",
    STOPPED_EARLY: "border-orange-200 bg-orange-50 text-orange-800",
  };
export function flashSaleError(error: unknown): string {
  if (axios.isAxiosError<{ code?: string; message?: unknown }>(error)) {
    if (error.response?.status === 403)
      return "Bạn không có quyền quản lý Flash Sale.";
    if (error.response?.status === 401) return "Vui lòng đăng nhập lại.";
    const data = error.response?.data;
    if (
      data?.code?.startsWith("FLASH_SALE_") &&
      typeof data.message === "string"
    )
      return data.message;
    if (Array.isArray(data?.message) && typeof data.message[0] === "string")
      return data.message[0];
  }
  return error instanceof Error && !axios.isAxiosError(error)
    ? error.message
    : "Không thể cập nhật Flash Sale. Vui lòng thử lại.";
}
