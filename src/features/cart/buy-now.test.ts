import { describe, expect, it, vi } from "vitest";
import type {
  CartResponseDto,
  CheckoutPreviewResponseDto,
} from "@/api/generated/models";
import {
  BuyNowSelectionError,
  prepareBuyNow,
  needsFlashConfirmation,
} from "./buy-now";
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
    refresh: vi.fn().mockResolvedValue({
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
  it.each([1, 5])(
    "replaces existing quantity %i with the exact requested quantity without touching other lines",
    async (quantity) => {
      const { actions, cart } = fixture();
      const other = {
        ...item,
        productVariantId: "other",
        cartItemId: "other-item",
        quantity: 3,
      };
      vi.mocked(actions.refresh).mockResolvedValue({
        ...cart,
        items: [{ ...item, quantity }, other],
      } as CartResponseDto);
      vi.mocked(actions.update).mockResolvedValue({
        ...cart,
        items: [item, other],
      } as CartResponseDto);
      const navigation = await prepareBuyNow(
        actions, "selected", 2, "branch", "offer",
      );
      expect(actions.update).toHaveBeenCalledExactlyOnceWith(item.cartItemId, {
        quantity: 2,
      });
      expect(actions.add).not.toHaveBeenCalled();
      expect(actions.remove).not.toHaveBeenCalled();
      expect(actions.changeBranch).not.toHaveBeenCalled();
      expect(other.quantity).toBe(3);
      expect(navigation.query).toEqual({
        items: item.cartItemId,
        flashOffer: "offer",
      });
    },
  );
  it("rejects failed updates without falling back to an additive mutation", async () => {
    const { actions } = fixture(true);
    vi.mocked(actions.update).mockRejectedValueOnce(
      new Error("insufficient stock"),
    );
    await expect(
      prepareBuyNow(actions, "selected", 2, "branch"),
    ).rejects.toThrow("insufficient stock");
    expect(actions.add).not.toHaveBeenCalled();
  });
  it.each([
    { branch: { id: "other" }, items: [item] },
    { branch: { id: "branch" }, items: [] },
    { branch: { id: "branch" }, items: [{ ...item, quantity: 5 }] },
    { branch: { id: "branch" }, items: [{ ...item, isCheckoutEligible: false }] },
  ])("rejects stale, mismatched or ineligible update responses: %j", async (response) => {
    const { actions } = fixture(true);
    vi.mocked(actions.update).mockResolvedValue(response as CartResponseDto);
    await expect(
      prepareBuyNow(actions, "selected", 2, "branch"),
    ).rejects.toThrow(BuyNowSelectionError);
  });
  it("does not navigate with an update returned after the session or selection changes", async () => {
    const { actions } = fixture(true);
    const isCurrent = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    await expect(
      prepareBuyNow(actions, "selected", 2, "branch", undefined, isCurrent),
    ).rejects.toThrow(BuyNowSelectionError);
    expect(actions.update).toHaveBeenCalledOnce();
  });
  it("reuses a matching existing item and selects only it from multiple cart lines", async () => {
    const { actions, cart } = fixture();
    vi.mocked(actions.refresh).mockResolvedValue({
      ...cart,
      items: [
        item,
        {
          ...item,
          productVariantId: "other",
          cartItemId: "01ARZ3NDEKTSV4RRFFQ69G5FAW",
          quantity: 5,
        },
      ],
    } as CartResponseDto);
    const navigation = await prepareBuyNow(actions, "selected", 2, "branch");
    expect(navigation.query).toEqual({ items: item.cartItemId });
    expect(actions.add).not.toHaveBeenCalled();
    expect(actions.update).not.toHaveBeenCalled();
  });
  it("does not mutate after the session or selection changes during refresh", async () => {
    const { actions } = fixture();
    await expect(
      prepareBuyNow(actions, "selected", 2, "branch", undefined, () => false),
    ).rejects.toThrow("lựa chọn");
    expect(actions.add).not.toHaveBeenCalled();
    expect(actions.update).not.toHaveBeenCalled();
  });
  it("rejects mutation failure and a context changed while adding", async () => {
    const { actions } = fixture();
    vi.mocked(actions.add).mockRejectedValueOnce(new Error("network"));
    await expect(
      prepareBuyNow(actions, "selected", 2, "branch"),
    ).rejects.toThrow("network");
    const isCurrent = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    await expect(
      prepareBuyNow(actions, "selected", 2, "branch", undefined, isCurrent),
    ).rejects.toThrow("Sản phẩm");
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
