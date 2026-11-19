import { describe, expect, it } from "vitest";
import {
  applyBulk,
  flashSalePayload,
  newFlashRow,
  percentToVnd,
  rowError,
  vndToPercent,
} from "./flash-sale-form";
const variant = {
  variantId: "variant",
  productId: "product",
  productName: "Sách kiểm thử",
  productSlug: "sach",
  variantLabel: "Bìa mềm",
  sku: null,
  imageUrl: null,
  catalogPrice: 300000,
  globalAvailableStock: 10,
};
const valid = () => ({
  ...newFlashRow(variant),
  flashPrice: "240000",
  percent: "20",
  totalQuota: 10,
  maxQuantityPerUser: 2,
});
describe("Flash Sale form rules", () => {
  it.each([
    [300000, "20", 240000],
    [2290000, "20", 1832000],
    [99999, "33,33", 66669],
    [5, "50", 3],
  ])("converts %s × %s deterministically", (catalog, percent, price) =>
    expect(percentToVnd(catalog, percent)).toBe(price),
  );
  it.each(["", "0", "100", "-1", "20.123", "abc", "Infinity", "1e2"])(
    "rejects invalid percentage %s",
    (value) => expect(() => percentToVnd(300000, value)).toThrow(),
  );
  it("mode switches preserve canonical VND after repeated round trips", () => {
    const row = { ...valid(), flashPrice: "183247" };
    for (let n = 0; n < 100; n++) {
      row.mode = "PERCENT";
      row.percent = vndToPercent(row.catalogPrice, Number(row.flashPrice));
      row.mode = "VND";
    }
    expect(row.flashPrice).toBe("183247");
  });
  it("rejects quota beyond global stock, noninteger limit and non-discount prices", () => {
    expect(rowError({ ...valid(), totalQuota: 11 })).toContain("10");
    expect(rowError({ ...valid(), maxQuantityPerUser: 1.5 })).toContain(
      "Giới hạn",
    );
    expect(rowError({ ...valid(), flashPrice: "300000" })).toContain("Giá");
  });
  it("bulk percentages use each catalog and change only prices", () => {
    const rows = [
      valid(),
      { ...valid(), variantId: "v2", catalogPrice: 100000 },
    ];
    const next = applyBulk(rows, "price", "20", "PERCENT");
    expect(next.map((row) => row.flashPrice)).toEqual(["240000", "80000"]);
    expect(next.map((row) => [row.totalQuota, row.maxQuantityPerUser])).toEqual(
      [
        [10, 2],
        [10, 2],
      ],
    );
    expect(rows[1]?.flashPrice).toBe("240000");
  });
  it("applies a fixed price to mixed catalogs as editable rows, but rejects invalid rows at save", () => {
    const rows = [
      valid(),
      { ...valid(), variantId: "v2", catalogPrice: 100000 },
    ];
    const next = applyBulk(rows, "price", "200000", "VND");
    expect(next.map((row) => row.flashPrice)).toEqual(["200000", "200000"]);
    expect(rowError(next[0]!)).toBe("");
    expect(rowError(next[1]!)).toContain("giá gốc");
    expect(rows[1]!.flashPrice).toBe("240000");
    expect(() =>
      flashSalePayload(
        {
          name: "Giờ vàng",
          description: "",
          startAt: "2026-11-19T05:00:00Z",
          endAt: "2026-11-19T06:00:00Z",
        },
        next,
      ),
    ).toThrow("giá gốc");
  });
  it.each(["0", "-1", "1.5", "10000000000", "NaN"])(
    "rejects malformed bulk money %s before changing rows",
    (value) => {
      const rows = [valid()];
      expect(() => applyBulk(rows, "price", value, "VND")).toThrow();
      expect(rows[0]!.flashPrice).toBe("240000");
    },
  );
  it("invalid bulk rejects every change atomically", () => {
    const rows = [
      valid(),
      { ...valid(), variantId: "v2", globalAvailableStock: 3 },
    ];
    const before = structuredClone(rows);
    expect(() => applyBulk(rows, "quota", "5", "VND")).toThrow();
    expect(rows).toEqual(before);
    expect(() => applyBulk(rows, "limit", "11", "VND")).toThrow();
    expect(rows).toEqual(before);
  });
  it("builds only canonical amounts and variant IDs", () => {
    const result = flashSalePayload(
      {
        name: "  Sách hay ",
        description: "",
        startAt: "2026-11-18T05:00:00.000Z",
        endAt: "2026-11-18T06:00:00.000Z",
      },
      [valid()],
    );
    expect(result.name).toBe("Sách hay");
    expect(result.items[0]).toEqual({
      variantId: "variant",
      flashPrice: 240000,
      totalQuota: 10,
      maxQuantityPerUser: 2,
    });
  });
});
