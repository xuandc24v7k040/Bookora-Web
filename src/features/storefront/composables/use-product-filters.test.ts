// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { expect, it } from "vitest";
import { useProductFilters } from "./use-product-filters";

it("resets newest to page one while retaining every effective catalog filter", async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/san-pham", component: { template: "<div />" } }],
  });
  await router.push(
    "/san-pham?page=3&pageSize=24&q=book&category=fiction&author=a&publisher=p&attribute=LANGUAGE:vi&priceMin=100&onSale=true",
  );
  let filters!: ReturnType<typeof useProductFilters>;
  const wrapper = mount(
    defineComponent({
      setup() {
        filters = useProductFilters();
        return () => null;
      },
    }),
    { global: { plugins: [router] } },
  );
  const before = { ...filters.params.value };
  await filters.update({ sort: "newest" });
  expect(filters.params.value).toEqual({ ...before, sort: "newest", page: 1 });
  await filters.update({ page: 2 }, false);
  expect(filters.params.value.page).toBe(2);
  expect(filters.params.value.sort).toBe("newest");
  wrapper.unmount();
});
