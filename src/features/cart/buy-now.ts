import type {
  CartResponseDto,
  CheckoutPreviewResponseDto,
} from "@/api/generated/models";
import type { useCartActions } from "./api/cart-api";
import { serializeCheckoutCartItemIds } from "@/features/checkout/utils/checkout-selection";

export async function prepareBuyNow(
  actions: ReturnType<typeof useCartActions>,
  variantId: string,
  quantity: number,
  branchId: string,
  flashOffer?: string,
) {
  const cart = await actions.refresh();
  if (cart.branch.id !== branchId)
    throw new Error("Chi nhánh đã thay đổi. Vui lòng thử lại.");
  const existing = cart.items.find((i) => i.productVariantId === variantId);
  const next: CartResponseDto = existing
    ? await actions.update(existing.cartItemId, { quantity })
    : await actions.add({ productVariantId: variantId, quantity }, "BUY_NOW");
  const item = next.items.find((i) => i.productVariantId === variantId);
  if (
    next.branch.id !== branchId ||
    !item ||
    item.quantity !== quantity ||
    !item.isCheckoutEligible
  )
    throw new Error(
      "Sản phẩm hoặc số lượng đã thay đổi. Vui lòng kiểm tra giỏ hàng.",
    );
  return {
    name: "client-checkout",
    query: {
      items: serializeCheckoutCartItemIds([item.cartItemId]),
      ...(flashOffer ? { flashOffer } : {}),
    },
  };
}

export function needsFlashConfirmation(
  expected: unknown,
  preview: CheckoutPreviewResponseDto | null,
  accepted: boolean,
): boolean {
  return (
    typeof expected === "string" &&
    Boolean(preview) &&
    !accepted &&
    !preview!.items.some(
      (item) => item.eligible && item.flashSaleItemId === expected,
    )
  );
}
