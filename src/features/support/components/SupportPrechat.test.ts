// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { reactive, ref } from "vue";
const list = vi.hoisted(() => vi.fn());
vi.mock("@/features/orders/api/customer-orders-api", () => ({
  listCustomerOrders: list,
}));
vi.mock("@/stores/storefront-branch.store", () => ({
  useStorefrontBranchStore: () => ({ selectedBranchId: null }),
}));
vi.mock("@/features/storefront/api/storefront-api", () => ({
  useStorefrontBranchesQuery: () => ({
    data: ref([{ id: "branch", name: "Chi nhánh QA" }]),
    isPending: ref(false),
    isError: ref(false),
  }),
}));
const store = reactive({
  scope: { key: "owner" },
  canUse: true,
  draft: null,
  messages: [],
  error: "",
  beginGeneral: vi.fn(),
  contactOrder: vi.fn(),
});
vi.mock("../state/support.store", () => ({ useSupportStore: () => store }));
import SupportPrechat from "./SupportPrechat.vue";
let wrapper: ReturnType<typeof mount>;
let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  list.mockResolvedValue({ items: [], totalPages: 0 });
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  wrapper = mount(SupportPrechat, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient: client }]],
      stubs: {
        ScrollArea: { template: "<div><slot /></div>" },
        SupportThread: true,
      },
    },
  });
});
afterEach(() => {
  wrapper.unmount();
  client.clear();
});
async function orderTab() {
  await wrapper
    .findAll("button")
    .find((button) => button.text().includes("Hỗ trợ đơn hàng"))!
    .trigger("click");
  await flushPromises();
  await new Promise((resolve) => setTimeout(resolve, 0));
}
describe("Support prechat owned orders", () => {
  it("uses the customer endpoint's maximum five items and distinguishes a valid empty list", async () => {
    await orderTab();
    expect(list).toHaveBeenCalledWith(
      { page: 1, limit: 5 },
      expect.any(AbortSignal),
    );
    expect(wrapper.text()).toContain("Bạn chưa có đơn hàng");
    expect(wrapper.text()).not.toContain("Không thể tải đơn hàng");
    expect(store.beginGeneral).not.toHaveBeenCalled();
    expect(store.contactOrder).not.toHaveBeenCalled();
  });
  it("keeps failure truthful and retries the real query", async () => {
    list.mockRejectedValueOnce(new Error("Network unavailable"));
    await orderTab();
    expect(wrapper.text()).toContain("Không thể tải đơn hàng");
    expect(wrapper.text()).not.toContain("Bạn chưa có đơn hàng");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Thử lại")!
      .trigger("click");
    await flushPromises();
    expect(list).toHaveBeenCalledTimes(2);
  });
});
