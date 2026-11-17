import axios from "axios";
import type { CheckoutCouponDto } from "@/api/generated/models";
import { formatVnd } from "@/features/products/utils/product-money";

export function couponBenefit(
  coupon: Pick<
    CheckoutCouponDto,
    "type" | "discountType" | "discountValue" | "maxDiscount"
  >,
): string {
  const benefit =
    coupon.discountType === "PERCENTAGE"
      ? `${coupon.discountValue}%`
      : formatVnd(coupon.discountValue);
  return `${coupon.type === "SHIPPING" ? "Giảm phí vận chuyển" : "Giảm"} ${benefit}${coupon.maxDiscount !== null ? `, tối đa ${formatVnd(coupon.maxDiscount)}` : ""}`;
}

export function couponErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401)
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (error.response?.status === 403)
      return "Bạn không có quyền quản lý khuyến mãi.";
    const data: unknown = error.response?.data;
    if (
      typeof data === "object" &&
      data !== null &&
      "code" in data &&
      typeof data.code === "string" &&
      (data.code.startsWith("COUPON_") ||
        data.code === "CHECKOUT_PREVIEW_CHANGED") &&
      "message" in data &&
      typeof data.message === "string"
    )
      return data.message;
  }
  return "Không thể cập nhật voucher. Vui lòng kiểm tra kết nối và thử lại.";
}
