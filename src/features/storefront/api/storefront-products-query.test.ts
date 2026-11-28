// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { defineComponent, h, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { StorefrontProductsListParams } from "@/api/generated/models";
import { useStorefrontProductsQuery } from "./storefront-api";

const { list } = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock(
  "@/api/generated/endpoints/storefront-catalog/storefront-catalog",
  () => ({
    storefrontProductsList: list,
  }),
);

describe("product query changes", () => {
  it("clears visible previous results when a different query starts", async () => {
    list.mockReset();
    let finishB!: (value: unknown) => void;
    list.mockResolvedValueOnce({ data: { items: [{ id: "cached-A" }] } });
    list.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishB = resolve;
        }),
    );
    const params = ref<StorefrontProductsListParams>({ q: "A" });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = mount(
      defineComponent({
        setup() {
          const query = useStorefrontProductsQuery(params);
          return () => h("div", JSON.stringify(query.data.value ?? null));
        },
      }),
      { global: { plugins: [[VueQueryPlugin, { queryClient: client }]] } },
    );
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(wrapper.text()).toContain("cached-A");
    params.value = { q: "B" };
    await flushPromises();
    expect(wrapper.text()).not.toContain("cached-A");
    finishB({ data: { items: [{ id: "new-B" }] } });
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(wrapper.text()).toContain("new-B");
    wrapper.unmount();
    client.clear();
  });

  it("does not display results for A while B is pending, and ignores a late A response", async () => {
    let finishA!: (value: unknown) => void;
    let finishB!: (value: unknown) => void;
    list.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishA = resolve;
        }),
    );
    list.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishB = resolve;
        }),
    );
    const params = ref<StorefrontProductsListParams>({ q: "A" });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = mount(
      defineComponent({
        setup() {
          const query = useStorefrontProductsQuery(params);
          return () => h("div", JSON.stringify(query.data.value ?? null));
        },
      }),
      { global: { plugins: [[VueQueryPlugin, { queryClient: client }]] } },
    );
    await flushPromises();
    params.value = { q: "B" };
    await flushPromises();
    finishA({ data: { items: [{ id: "from-A" }] } });
    await flushPromises();
    expect(wrapper.text()).not.toContain("from-A");
    finishB({ data: { items: [{ id: "from-B" }] } });
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(wrapper.text()).toContain("from-B");
    wrapper.unmount();
    client.clear();
  });
});
