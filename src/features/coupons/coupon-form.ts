import { z } from "zod";
import { AdminCouponsCreateBody } from "@/api/generated/zod/admin-coupons/admin-coupons";

const money = z
  .number({ error: "Vui lòng nhập số tiền hợp lệ." })
  .int("Số tiền phải là số nguyên VND.")
  .min(0, "Số tiền không được âm.")
  .max(9_999_999_999, "Số tiền tối đa là 9.999.999.999đ.");
const quota = z
  .number({ error: "Số lượt phải là số nguyên." })
  .int("Số lượt phải là số nguyên.")
  .min(1, "Số lượt phải lớn hơn 0.")
  .max(2_147_483_647, "Số lượt vượt giới hạn.")
  .nullable();
export const couponFormSchema = AdminCouponsCreateBody.extend({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9_-]{3,40}$/,
      "Mã cần 3–40 ký tự, chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới.",
    ),
  name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên ưu đãi.")
    .max(120, "Tên tối đa 120 ký tự."),
  description: z.string().max(500, "Mô tả tối đa 500 ký tự.").optional(),
  discountValue: z
    .number({ error: "Giá trị giảm không hợp lệ." })
    .positive("Giá trị giảm phải lớn hơn 0.")
    .max(9_999_999_999, "Giá trị giảm vượt giới hạn."),
  minOrderAmount: money.nullable(),
  maxDiscount: money.nullable(),
  usageLimit: quota,
  usageLimitPerUser: quota,
  startAt: z.iso.datetime({ error: "Vui lòng chọn thời điểm bắt đầu hợp lệ." }),
  endAt: z.iso.datetime({ error: "Vui lòng chọn thời điểm kết thúc hợp lệ." }),
}).superRefine((data, ctx) => {
  const issue = (path: string, message: string) =>
    ctx.addIssue({ code: "custom", path: [path], message });
  if (data.discountType === "PERCENTAGE") {
    if (
      data.discountValue > 100 ||
      Math.abs(
        Math.round(data.discountValue * 100) - data.discountValue * 100,
      ) > 0.000001
    )
      issue(
        "discountValue",
        "Phần trăm giảm từ 0,01 đến 100, tối đa 2 chữ số thập phân.",
      );
  } else if (!Number.isSafeInteger(data.discountValue))
    issue("discountValue", "Số tiền giảm phải là số nguyên VND.");
  if (Date.parse(data.startAt) >= Date.parse(data.endAt))
    issue("endAt", "Thời điểm kết thúc phải sau thời điểm bắt đầu.");
  if (
    data.usageLimit &&
    data.usageLimitPerUser &&
    data.usageLimitPerUser > data.usageLimit
  )
    issue("usageLimitPerUser", "Giới hạn mỗi người không được vượt tổng lượt.");
  if (
    data.discountType === "FIXED_AMOUNT" &&
    data.maxDiscount !== null &&
    data.maxDiscount > data.discountValue
  )
    issue("maxDiscount", "Mức giảm tối đa không được vượt số tiền giảm.");
});
