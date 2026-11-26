import type {
  CartResponseDto,
  CheckoutPreviewResponseDto,
} from "@/api/generated/models";
import type { useCartActions } from "./api/cart-api";
import { serializeCheckoutCartItemIds } from "@/features/checkout/utils/checkout-selection";

export class BuyNowSelectionError extends Error {}

export async function prepareBuyNow(
  actions: ReturnType<typeof useCartActions>,
  variantId: string,
  quantity: number,
  branchId: string,
  flashOffer?: string,
  isCurrent: () => boolean = () => true,
) {
  const cart = await actions.refresh();
  if (cart.branch.id !== branchId || !isCurrent())
    throw new BuyNowSelectionError(
      "Chi nhánh hoặc lựa chọn đã thay đổi. Vui lòng thử lại.",
    );
  const existing = cart.items.find((i) => i.productVariantId === variantId);
  const next: CartResponseDto = existing
    ? existing.quantity === quantity
      ? cart
      : await actions.update(existing.cartItemId, { quantity })
    : await actions.add({ productVariantId: variantId, quantity }, "BUY_NOW");
  const item = next.items.find((i) => i.productVariantId === variantId);
  if (
    next.branch.id !== branchId ||
    !isCurrent() ||
    !item ||
    item.quantity !== quantity ||
    !item.isCheckoutEligible
  )
    throw new BuyNowSelectionError(
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
