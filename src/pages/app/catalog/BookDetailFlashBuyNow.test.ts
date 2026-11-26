// @vitest-environment happy-dom
import { mount, flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import { beforeEach, expect, it, vi } from "vitest";
import BookDetailPage from "./BookDetailPage.vue";
const mocks = vi.hoisted(() => ({
  hasOffer: true,
  push: vi.fn(),
  refresh: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  auth: {
    user: { id: "customer", type: "CUSTOMER" } as {
      id: string;
      type: string;
    } | null,
    status: "authenticated",
  },
  branch: { selectedBranchId: "branch" },
}));
vi.mock("vue-router", () => ({
  useRoute: () => ({
    params: { slug: "book" },
    query: { variant: "selected" },
    fullPath: "/san-pham/book?variant=selected",
  }),
  useRouter: () => ({ push: mocks.push }),
  RouterLink: { template: "<a><slot /></a>" },
}));
vi.mock("@/stores/auth.store", () => ({
  useAuthStore: () => mocks.auth,
}));
vi.mock("@/stores/storefront-branch.store", () => ({
  useStorefrontBranchStore: () => mocks.branch,
}));
vi.mock("@/features/cart/api/cart-api", () => ({
  useCartActions: () => mocks,
}));
vi.mock("@/features/storefront/api/storefront-api", () => ({
  useStorefrontProductDetailQuery: () => ({
    data: ref({
      id: "p",
      slug: "book",
      name: "Sách",
      categories: [],
      authors: [],
      options: [],
      attributes: [],
      variants: [{ id: "selected" }],
      generalMedia: [],
      reviewCount: 0,
    }),
    isPending: ref(false),
    isError: ref(false),
  }),
  useStorefrontAvailabilityQuery: () => ({
    data: ref({ variants: [{ variantId: "selected", availableQuantity: 8 }] }),
    isSuccess: ref(true),
    isError: ref(false),
  }),
}));
vi.mock("@/features/storefront/composables/use-variant-selection", () => ({
  useVariantSelection: () => ({
    selectedVariantId: ref("selected"),
    selectedVariant: ref({ id: "selected" }),
    displayedVariant: ref({
      id: "selected",
      name: "Bìa mềm",
      media: [],
      price: { current: 100000, original: 100000, onSale: false },
    }),
    selectVariant: vi.fn(),
  }),
}));
vi.mock("@/features/storefront/composables/use-product-seo", () => ({
  useProductSeo: vi.fn(),
}));
vi.mock("@/features/storefront/composables/use-recently-viewed", () => ({
  useRecentlyViewed: () => ({ add: () => true }),
}));
vi.mock("@/features/flash-sales/api/flash-sale-api", () => ({
  useFlashEligibility: () => ({
    data: ref({
      offer: mocks.hasOffer
        ? { itemId: "offer", remaining: 5, userRemaining: 3 }
        : null,
    }),
    isSuccess: ref(true),
    refetch: vi.fn(),
  }),
}));
it("clicks the real Flash Sale CTA and navigates only its selected variant and quantity to Checkout", async () => {
  mocks.refresh.mockResolvedValue({ branch: { id: "branch" }, items: [] });
  mocks.add.mockResolvedValue({
    branch: { id: "branch" },
    items: [
      {
        cartItemId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        productVariantId: "selected",
        quantity: 2,
        isCheckoutEligible: true,
      },
    ],
  });
  const wrapper = mount(BookDetailPage, {
    global: {
      stubs: [
        "ProductGallery",
        "WishlistButton",
        "FlashSalePriceBox",
        "ProductAvailability",
        "RecentlyViewedSection",
        "RelatedProductsSection",
        "PublicReviewSection",
        "ProductVariantSelector",
      ],
    },
  });
  await wrapper.find('[aria-label="Tăng số lượng"]').trigger("click");
  const buy = wrapper
    .findAll("button")
    .find((b) => b.text().includes("Mua ngay giá Flash Sale"))!;
  await buy.trigger("click");
  await flushPromises();
  expect(mocks.add).toHaveBeenCalledWith(
    { productVariantId: "selected", quantity: 2 },
    "BUY_NOW",
  );
  expect(mocks.push).toHaveBeenCalledWith({
    name: "client-checkout",
    query: { items: "01ARZ3NDEKTSV4RRFFQ69G5FAV", flashOffer: "offer" },
  });
  wrapper.unmount();
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.hasOffer = true;
  mocks.auth.user = { id: "customer", type: "CUSTOMER" };
  mocks.branch.selectedBranchId = "branch";
});
it("navigates regular Buy Now directly to Checkout with its exact selected quantity", async () => {
  mocks.hasOffer = false;
  mocks.refresh.mockResolvedValue({ branch: { id: "branch" }, items: [] });
  mocks.add.mockResolvedValue({
    branch: { id: "branch" },
    items: [
      {
        cartItemId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        productVariantId: "selected",
        quantity: 2,
        isCheckoutEligible: true,
      },
    ],
  });
  const wrapper = mount(BookDetailPage, {
    global: {
      stubs: [
        "ProductGallery",
        "WishlistButton",
        "FlashSalePriceBox",
        "ProductAvailability",
        "RecentlyViewedSection",
        "RelatedProductsSection",
        "PublicReviewSection",
        "ProductVariantSelector",
      ],
    },
  });
  await wrapper.find('[aria-label="Tăng số lượng"]').trigger("click");
  await wrapper
    .findAll("button")
    .find((b) => b.text().trim() === "Mua ngay")!
    .trigger("click");
  await flushPromises();
  expect(mocks.refresh).toHaveBeenCalledOnce();
  expect(mocks.add).toHaveBeenCalledWith(
    { productVariantId: "selected", quantity: 2 },
    "BUY_NOW",
  );
  expect(mocks.push).toHaveBeenCalledWith({
    name: "client-checkout",
    query: { items: "01ARZ3NDEKTSV4RRFFQ69G5FAV" },
  });
  wrapper.unmount();
});

const detailStubs = [
  "ProductGallery",
  "WishlistButton",
  "FlashSalePriceBox",
  "ProductAvailability",
  "RecentlyViewedSection",
  "RelatedProductsSection",
  "PublicReviewSection",
  "ProductVariantSelector",
];

it.each([1, 5])("updates existing quantity %i and checks out only that item", async (quantity) => {
  mocks.hasOffer = false;
  const selected = {
    cartItemId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    productVariantId: "selected",
    quantity: 2,
    isCheckoutEligible: true,
  };
  const other = {
    ...selected,
    cartItemId: "other-item",
    productVariantId: "other",
    quantity: 3,
  };
  mocks.refresh.mockResolvedValue({
    branch: { id: "branch" },
    items: [{ ...selected, quantity }, other],
  });
  mocks.update.mockResolvedValue({
    branch: { id: "branch" },
    items: [selected, other],
  });
  const wrapper = mount(BookDetailPage, { global: { stubs: detailStubs } });
  await wrapper.find('[aria-label="Tăng số lượng"]').trigger("click");
  await wrapper
    .findAll("button")
    .find((b) => b.text().trim() === "Mua ngay")!
    .trigger("click");
  await flushPromises();
  expect(mocks.update).toHaveBeenCalledExactlyOnceWith(selected.cartItemId, {
    quantity: 2,
  });
  expect(mocks.add).not.toHaveBeenCalled();
  expect(mocks.push).toHaveBeenCalledExactlyOnceWith({
    name: "client-checkout",
    query: { items: selected.cartItemId },
  });
  wrapper.unmount();
});

it("does not navigate when the existing item update fails", async () => {
  mocks.refresh.mockResolvedValue({
    branch: { id: "branch" },
    items: [{
      cartItemId: "existing",
      productVariantId: "selected",
      quantity: 5,
    }],
  });
  mocks.update.mockRejectedValueOnce(new Error("network"));
  const wrapper = mount(BookDetailPage, { global: { stubs: detailStubs } });
  await wrapper
    .findAll("button")
    .find((b) => b.text().includes("Mua ngay"))!
    .trigger("click");
  await flushPromises();
  expect(mocks.update).toHaveBeenCalledExactlyOnceWith("existing", { quantity: 1 });
  expect(mocks.add).not.toHaveBeenCalled();
  expect(mocks.push).not.toHaveBeenCalled();
  wrapper.unmount();
});

it("keeps Add to Cart on the product page without preparing checkout", async () => {
  mocks.hasOffer = false;
  mocks.add.mockResolvedValue({});
  const wrapper = mount(BookDetailPage, { global: { stubs: detailStubs } });
  await wrapper
    .findAll("button")
    .find((b) => b.text().trim() === "Thêm vào giỏ hàng")!
    .trigger("click");
  await flushPromises();
  expect(mocks.add).toHaveBeenCalledWith(
    { productVariantId: "selected", quantity: 1 },
    "ADD_ITEM",
  );
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(mocks.push).not.toHaveBeenCalled();
  wrapper.unmount();
});

it("keeps the guest login return contract without mutating the cart", async () => {
  mocks.auth.user = null;
  const wrapper = mount(BookDetailPage, { global: { stubs: detailStubs } });
  await wrapper
    .findAll("button")
    .find((b) => b.text().includes("Mua ngay"))!
    .trigger("click");
  await flushPromises();
  expect(mocks.push).toHaveBeenCalledWith({
    path: "/login",
    query: { returnTo: "/san-pham/book?variant=selected" },
  });
  expect(mocks.add).not.toHaveBeenCalled();
  expect(mocks.refresh).not.toHaveBeenCalled();
  wrapper.unmount();
});

it("ignores rapid clicks and stops before mutation if the branch changes during refresh", async () => {
  let resolveCart!: (cart: { branch: { id: string }; items: never[] }) => void;
  mocks.refresh.mockReturnValue(
    new Promise((resolve) => {
      resolveCart = resolve;
    }),
  );
  const wrapper = mount(BookDetailPage, { global: { stubs: detailStubs } });
  const buy = wrapper
    .findAll("button")
    .find((b) => b.text().includes("Mua ngay"))!;
  await buy.trigger("click");
  await buy.trigger("click");
  expect(mocks.refresh).toHaveBeenCalledOnce();
  mocks.branch.selectedBranchId = "other";
  resolveCart({ branch: { id: "branch" }, items: [] });
  await flushPromises();
  expect(mocks.add).not.toHaveBeenCalled();
  expect(mocks.push).not.toHaveBeenCalled();
  wrapper.unmount();
});

it("does not navigate to Checkout when adding the selected item fails", async () => {
  mocks.refresh.mockResolvedValue({ branch: { id: "branch" }, items: [] });
  mocks.add.mockRejectedValueOnce(new Error("network"));
  const wrapper = mount(BookDetailPage, { global: { stubs: detailStubs } });
  await wrapper
    .findAll("button")
    .find((b) => b.text().includes("Mua ngay"))!
    .trigger("click");
  await flushPromises();
  expect(mocks.push).not.toHaveBeenCalled();
  wrapper.unmount();
});
