import { describe, expect, it } from "vitest";
import { formatShippingEta } from "./shipping-eta";

describe("shipping ETA Vietnam calendar date", () => {
  it("converts either side of UTC 17:00 to the correct Vietnamese date", () => {
    expect(formatShippingEta("2026-11-27T16:59:59Z")).toBe("27/11/2026");
    expect(formatShippingEta("2026-11-27T17:00:00Z")).toBe("28/11/2026");
  });
  it("does not invent a date for an invalid timestamp", () => {
    expect(formatShippingEta("invalid")).toBe("Chưa xác định");
  });
});
