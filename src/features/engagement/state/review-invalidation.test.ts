import { QueryClient } from "@tanstack/vue-query";
import { describe, expect, it } from "vitest";
import { invalidateReviewProduct } from "./review-invalidation";

describe("Review rating cache", () => {
  it("invalidates affected product cards/detail/admin while retaining unrelated catalog pages", () => {
    const client = new QueryClient();
    client.setQueryData(["storefront", "detail", "sach-a"], { id: "a" });
    client.setQueryData(["storefront", "products", { page: 1 }], {
      items: [{ id: "a" }, { id: "b" }],
    });
    client.setQueryData(["storefront", "products", { page: 2 }], {
      items: [{ id: "c" }],
    });
    client.setQueryData(["storefront", "home"], { newest: [{ id: "a" }] });
    client.setQueryData(["storefront", "branches"], [{ id: "branch" }]);
    client.setQueryData(["admin-reviews"], { items: [] });
    invalidateReviewProduct(client, { productId: "a", productSlug: "sach-a" });
    expect(
      client.getQueryState(["storefront", "detail", "sach-a"])?.isInvalidated,
    ).toBe(true);
    expect(
      client.getQueryState(["storefront", "products", { page: 1 }])
        ?.isInvalidated,
    ).toBe(true);
    expect(client.getQueryState(["storefront", "home"])?.isInvalidated).toBe(
      true,
    );
    expect(client.getQueryState(["admin-reviews"])?.isInvalidated).toBe(true);
    expect(
      client.getQueryState(["storefront", "products", { page: 2 }])
        ?.isInvalidated,
    ).toBe(false);
    expect(
      client.getQueryState(["storefront", "branches"])?.isInvalidated,
    ).toBe(false);
    client.clear();
  });
});
