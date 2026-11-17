import type { SaveCouponDto } from "@/api/generated/models";

export const COUPON_TIME_ZONE = "Asia/Ho_Chi_Minh";
export type CouponPeriod = Pick<SaveCouponDto, "startAt" | "endAt">;
export type CouponTimeField = keyof CouponPeriod;

const MINUTE_MS = 60_000;

export function couponMinute(timestamp: number): number {
  return Math.floor(timestamp / MINUTE_MS) * MINUTE_MS;
}

export function couponTimeError(
  field: CouponTimeField,
  period: CouponPeriod,
  saved: CouponPeriod | null,
  now: number,
): string | undefined {
  const timestamp = Date.parse(period[field]);
  if (field === "endAt" && timestamp <= Date.parse(period.startAt)) {
    return "Thời điểm kết thúc phải sau thời điểm bắt đầu.";
  }
  if (period[field] === saved?.[field] || couponMinute(timestamp) >= couponMinute(now)) {
    return;
  }
  if (Number.isFinite(timestamp)) {
    return field === "startAt"
      ? "Thời điểm bắt đầu không được ở quá khứ."
      : "Thời điểm kết thúc không được ở quá khứ.";
  }
}
