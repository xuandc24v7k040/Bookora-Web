import { describe, expect, it } from "vitest";
import { couponFormSchema } from "./coupon-form";

const valid = {
  code: "BOOKORA10",
  name: "Giảm giá",
  type: "ORDER",
  visibility: "PUBLIC",
  discountType: "PERCENTAGE",
  discountValue: 10,
  minOrderAmount: 300000,
  maxDiscount: 40000,
  usageLimit: 100,
  usageLimitPerUser: 1,
  startAt: "2026-11-17T00:00:00.000Z",
  endAt: "2026-12-17T00:00:00.000Z",
  isActive: true,
};
describe("Coupon form financial validation", () => {
  it("normalizes code and accepts exact two-decimal percentages", () => {
    expect(
      couponFormSchema.parse({
        ...valid,
        code: " bookora10 ",
        discountValue: 12.34,
      }).code,
    ).toBe("BOOKORA10");
  });
  it.each([
    { discountValue: 0 },
    { discountValue: 100.01 },
    { discountValue: 1.234 },
    { discountType: "FIXED_AMOUNT", discountValue: 1.5 },
    { minOrderAmount: -1 },
    { maxDiscount: NaN },
    { minOrderAmount: 10000000000 },
    { usageLimitPerUser: 101 },
    { endAt: valid.startAt },
    { startAt: "" },
    { name: " " },
    { code: "bad code" },
  ])("rejects invalid money, dates or quota: %j", (change) => {
    const result = couponFormSchema.safeParse({ ...valid, ...change });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0]?.message).not.toMatch(
        /Invalid|expected|Too small|Too big/,
      );
  });
});
