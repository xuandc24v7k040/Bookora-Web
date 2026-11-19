import { z } from "zod";
import type {
  FlashSaleVariantDto,
  SaveFlashSaleDto,
} from "@/api/generated/models";

export type PriceMode = "VND" | "PERCENT";
export interface FlashSaleFormRow extends FlashSaleVariantDto {
  flashPrice: string;
  percent: string;
  totalQuota: number;
  maxQuantityPerUser: number;
  mode: PriceMode;
}
export function percentToVnd(catalog: number, input: string): number {
  if (!/^\d{1,2}(?:[.,]\d{1,2})?$/.test(input))
    throw new Error(
      "Tỷ lệ giảm phải lớn hơn 0, nhỏ hơn 100 và có tối đa 2 chữ số thập phân.",
    );
  const [whole = "0", fraction = ""] = input.replace(",", ".").split(".");
  const basisPoints = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (
    basisPoints <= 0 ||
    basisPoints >= 10000 ||
    !Number.isSafeInteger(catalog) ||
    catalog <= 0 ||
    catalog > 9_999_999_999
  )
    throw new Error("Giá hoặc tỷ lệ giảm không hợp lệ.");
  return Number(
    (BigInt(catalog) * BigInt(10000 - basisPoints) + 5000n) / 10000n,
  );
}
export function vndToPercent(catalog: number, price: number): string {
  if (
    catalog <= 0 ||
    !Number.isSafeInteger(price) ||
    price <= 0 ||
    price >= catalog
  )
    return "";
  const hundredths = Number(
    (BigInt(catalog - price) * 10000n + BigInt(Math.floor(catalog / 2))) /
      BigInt(catalog),
  );
  return String(hundredths / 100);
}
export function newFlashRow(variant: FlashSaleVariantDto): FlashSaleFormRow {
  return {
    ...variant,
    flashPrice: "",
    percent: "",
    mode: "VND",
    totalQuota: 1,
    maxQuantityPerUser: 1,
  };
}
export function flashPriceError(row: FlashSaleFormRow): string {
  const price = Number(row.flashPrice);
  if (
    !Number.isSafeInteger(price) ||
    price <= 0 ||
    price >= row.catalogPrice ||
    price > 9_999_999_999
  )
    return "Giá Flash Sale phải lớn hơn 0 và nhỏ hơn giá gốc.";
  return "";
}
export function rowError(row: FlashSaleFormRow): string {
  const priceError = flashPriceError(row);
  if (priceError) return priceError;
  if (
    !Number.isSafeInteger(row.totalQuota) ||
    row.totalQuota < 1 ||
    row.totalQuota > row.globalAvailableStock ||
    row.totalQuota > 2_147_483_647
  )
    return `Quota phải từ 1 đến ${row.globalAvailableStock} (tồn khả dụng toàn hệ thống).`;
  if (
    !Number.isSafeInteger(row.maxQuantityPerUser) ||
    row.maxQuantityPerUser < 1 ||
    row.maxQuantityPerUser > row.totalQuota
  )
    return "Giới hạn mỗi khách phải từ 1 đến quota.";
  return "";
}
export function applyBulk(
  rows: FlashSaleFormRow[],
  field: "price" | "quota" | "limit",
  input: string,
  mode: PriceMode,
): FlashSaleFormRow[] {
  if (!rows.length) throw new Error("Vui lòng thêm biến thể trước.");
  const next = rows.map((row) => {
    const copy = { ...row };
    if (field === "price") {
      copy.flashPrice = String(
        mode === "PERCENT"
          ? percentToVnd(row.catalogPrice, input)
          : Number(input),
      );
      copy.percent = vndToPercent(row.catalogPrice, Number(copy.flashPrice));
    } else if (field === "quota") copy.totalQuota = Number(input);
    else copy.maxQuantityPerUser = Number(input);
    const error =
      field === "price"
        ? !Number.isSafeInteger(Number(copy.flashPrice)) ||
          Number(copy.flashPrice) <= 0 ||
          Number(copy.flashPrice) > 9_999_999_999
          ? "Giá phải là số nguyên lớn hơn 0 và tối đa 9.999.999.999 ₫."
          : ""
        : field === "quota"
          ? !Number.isSafeInteger(copy.totalQuota) ||
            copy.totalQuota < copy.maxQuantityPerUser ||
            copy.totalQuota > copy.globalAvailableStock ||
            copy.totalQuota > 2_147_483_647
            ? `Quota phải từ ${copy.maxQuantityPerUser} đến ${copy.globalAvailableStock}.`
            : ""
          : !Number.isSafeInteger(copy.maxQuantityPerUser) ||
              copy.maxQuantityPerUser < 1 ||
              copy.maxQuantityPerUser > copy.totalQuota
            ? "Giới hạn phải từ 1 đến quota."
            : "";
    if (error) throw new Error(`${row.productName}: ${error}`);
    return copy;
  });
  return next;
}
export const flashSaleMetadataSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập tên chương trình.")
      .max(120, "Tên tối đa 120 ký tự."),
    description: z.string().max(500, "Mô tả tối đa 500 ký tự."),
    startAt: z.iso.datetime(),
    endAt: z.iso.datetime(),
  })
  .refine((value) => Date.parse(value.endAt) > Date.parse(value.startAt), {
    message: "Kết thúc phải sau thời gian bắt đầu.",
    path: ["endAt"],
  });
export function flashSalePayload(
  metadata: z.input<typeof flashSaleMetadataSchema>,
  rows: FlashSaleFormRow[],
): SaveFlashSaleDto {
  const result = flashSaleMetadataSchema.safeParse(metadata);
  if (!result.success)
    throw new Error(
      result.error.issues[0]?.message ?? "Thông tin chương trình không hợp lệ.",
    );
  if (!rows.length) throw new Error("Vui lòng chọn ít nhất một biến thể.");
  for (const row of rows) {
    const error = rowError(row);
    if (error) throw new Error(`${row.productName}: ${error}`);
  }
  return {
    ...result.data,
    items: rows.map((row) => ({
      variantId: row.variantId,
      flashPrice: Number(row.flashPrice),
      totalQuota: row.totalQuota,
      maxQuantityPerUser: row.maxQuantityPerUser,
    })),
  };
}
