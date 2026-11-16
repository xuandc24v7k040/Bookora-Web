import type { QueryClient } from "@tanstack/vue-query";

export type ReviewProductChange = { productId: string; productSlug: string };

function containsProduct(value: unknown, productId: string): boolean {
  if (Array.isArray(value))
    return value.some((item) => containsProduct(item, productId));
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.id === productId ||
    Object.values(record).some((item) => containsProduct(item, productId))
  );
}

/** Refresh only catalog caches that contain this product; leave unrelated catalog pages alone. */
export function invalidateReviewProduct(
  client: QueryClient,
  product: ReviewProductChange,
): void {
  void client.invalidateQueries({ queryKey: ["admin-reviews"] });
  void client.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === "storefront" &&
      ((query.queryKey[1] === "detail" &&
        query.queryKey[2] === product.productSlug) ||
        containsProduct(query.state.data, product.productId)),
  });
}
