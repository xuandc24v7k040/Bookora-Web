import { describe, expect, it, vi } from "vitest";
import type {
  CartResponseDto,
  CheckoutPreviewResponseDto,
} from "@/api/generated/models";
import { prepareBuyNow, needsFlashConfirmation } from "./buy-now";
import type { useCartActions } from "./api/cart-api";
const item = {
  cartItemId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  productVariantId: "selected",
  quantity: 2,
  isCheckoutEligible: true,
};
function fixture(existing = false) {
  const cart = { branch: { id: "branch" }, items: [item] } as CartResponseDto;
  const actions = {
    refresh: vi
      .fn()
      .mockResolvedValue({
        ...cart,
        items: existing ? [{ ...item, quantity: 5 }] : [],
      }),
    add: vi.fn().mockResolvedValue(cart),
    update: vi.fn().mockResolvedValue(cart),
    remove: vi.fn(),
    changeBranch: vi.fn(),
  } as unknown as ReturnType<typeof useCartActions>;
  return { actions, cart };
}
describe("Buy Now selection and Flash Sale intent", () => {
  it("uses the exact returned variant/item and requested quantity, enters canonical checkout without regular opt-out", async () => {
    const { actions } = fixture();
    const navigation = await prepareBuyNow(
      actions,
      "selected",
      2,
      "branch",
      "offer",
    );
    expect(actions.add).toHaveBeenCalledWith(
      { productVariantId: "selected", quantity: 2 },
      "BUY_NOW",
    );
    expect(navigation).toEqual({
      name: "client-checkout",
      query: { items: item.cartItemId, flashOffer: "offer" },
    });
    expect(navigation.query).not.toHaveProperty("regularPriceCartItemIds");
  });
  it("replaces existing cart quantity rather than silently adding it to the purchase", async () => {
    const { actions } = fixture(true);
    await prepareBuyNow(actions, "selected", 2, "branch");
    expect(actions.update).toHaveBeenCalledWith(item.cartItemId, {
      quantity: 2,
    });
    expect(actions.add).not.toHaveBeenCalled();
  });
  it("rejects stale branch and mismatched response before navigation", async () => {
    const { actions, cart } = fixture();
    await expect(
      prepareBuyNow(actions, "selected", 2, "other"),
    ).rejects.toThrow("Chi nhánh");
    vi.mocked(actions.add).mockResolvedValue({ ...cart, items: [] });
    await expect(
      prepareBuyNow(actions, "selected", 2, "branch"),
    ).rejects.toThrow("Sản phẩm");
  });
});

describe("Flash Sale intent confirmation", () => {
  const preview = (id: string | null) =>
    ({
      items: [{ eligible: true, flashSaleItemId: id }],
    }) as CheckoutPreviewResponseDto;
  it("accepts matching canonical offer and normal checkout, blocks expired or changed offers", () => {
    expect(needsFlashConfirmation("offer", preview("offer"), false)).toBe(
      false,
    );
    expect(needsFlashConfirmation(undefined, preview(null), false)).toBe(false);
    expect(needsFlashConfirmation("offer", preview(null), false)).toBe(true);
    expect(needsFlashConfirmation("offer", preview("other"), false)).toBe(true);
    expect(needsFlashConfirmation("offer", preview(null), true)).toBe(false);
  });
});
