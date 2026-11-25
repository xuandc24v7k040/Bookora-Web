// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick, reactive, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

const store = reactive({
  canUse: true,
  scope: { key: "fixture:branch", branchId: "branch" },
  activeId: "ticket",
  active: {
    id: "ticket", type: "ORDER", orderId: "order", customerName: "Customer",
    branchName: "Branch", assigneeName: "Staff", subject: "Topic",
    createdAt: "2026-11-24T00:00:00Z", updatedAt: "2026-11-24T00:00:00Z",
  },
  can: () => true,
});
vi.mock("../state/support.store", () => ({ useSupportStore: () => store }));
const context = {
  data: ref({ orderCode: "ORDER-QA", status: "COMPLETED", branchId: "branch", canViewOrderDetail: true }),
  isError: ref(false), refetch: vi.fn(),
};
vi.mock("../api/support-queries", () => ({ useSupportOrderContext: () => context }));
vi.mock("@tanstack/vue-query", () => ({
  useQuery: () => ({ data: ref(undefined), isError: ref(false), refetch: vi.fn() }),
  useInfiniteQuery: () => ({
    data: ref(undefined), isPending: ref(false), isError: ref(false),
    hasNextPage: ref(false), isFetchingNextPage: ref(false), refetch: vi.fn(),
  }),
}));
import SupportContext from "./SupportContext.vue";

describe("Support context navigation and lifecycle", () => {
  it("resolves the existing Admin Orders route with its required id parameter", async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: "/", component: { template: "<div />" } },
      { path: "/branch-admin/orders/:id", name: "branch-admin-order-detail", component: { template: "<div />" } },
    ] });
    await router.push("/");
    const wrapper = mount(SupportContext, {
      global: { plugins: [router], stubs: { ScrollArea: { template: "<div><slot /></div>" } } },
    });
    expect(wrapper.get("a").attributes("href")).toBe("/branch-admin/orders/order");
    store.active.type = "GENERAL";
    await nextTick();
    expect(wrapper.find("a").exists()).toBe(false);
    expect(wrapper.text()).toContain("Tư vấn chung");
    expect(wrapper.text()).not.toContain("ORDER-QA");
    wrapper.unmount();
  });
});
