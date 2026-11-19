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
  useAuthStore: () => ({
    user: { id: "customer", type: "CUSTOMER" },
    status: "authenticated",
  }),
}));
vi.mock("@/stores/storefront-branch.store", () => ({
  useStorefrontBranchStore: () => ({ selectedBranchId: "branch" }),
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
});
it("preserves the existing regular Buy Now cart flow without a Flash Sale", async () => {
  mocks.hasOffer = false;
  mocks.add.mockResolvedValue({});
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
  await wrapper
    .findAll("button")
    .find((b) => b.text().trim() === "Mua ngay")!
    .trigger("click");
  await flushPromises();
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(mocks.add).toHaveBeenCalledWith(
    { productVariantId: "selected", quantity: 1 },
    "BUY_NOW",
  );
  expect(mocks.push).toHaveBeenCalledWith("/cart");
  wrapper.unmount();
});
