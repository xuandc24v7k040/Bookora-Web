// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AnalyticsFilterBar from "./AnalyticsFilterBar.vue";
import DataTableDateRangeFilter from "@/components/admin/table/DataTableDateRangeFilter.vue";

describe("analytics range clear", () => {
  it("emits the 30D preset directly when the shared picker clears", async () => {
    const wrapper = mount(AnalyticsFilterBar, {
      props: { preset: "CUSTOM", from: "2026-11-01", to: "2026-11-20" },
      global: { stubs: { DataTableDateRangeFilter: true } },
    });
    wrapper
      .findComponent(DataTableDateRangeFilter)
      .vm.$emit("update:modelValue", undefined);
    expect(wrapper.emitted("presetChange")).toEqual([["30D"]]);
    expect(wrapper.emitted("customChange")).toBeUndefined();
    wrapper
      .findComponent(DataTableDateRangeFilter)
      .vm.$emit("update:modelValue", {
        start: "2026-11-02",
        end: "2026-11-15",
      });
    expect(wrapper.emitted("customChange")).toEqual([
      [{ from: "2026-11-02", to: "2026-11-15" }],
    ]);
    wrapper.unmount();
  });
});
