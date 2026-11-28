// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";
import { normalizeAnalyticsDateFilter } from "./analytics-date-filter";
import { useAnalyticsDateFilter } from "./use-analytics-date-filter";

describe("analytics date filter normalization", () => {
  it.each([
    { preset: "CUSTOM" },
    { preset: "CUSTOM", from: "2026-11-01" },
    { preset: "CUSTOM", to: "2026-11-20" },
    { preset: "CUSTOM", from: "2026-11-20", to: "2026-11-01" },
    { preset: "CUSTOM", from: "2026-02-30", to: "2026-03-05" },
    { preset: "CUSTOM", from: "2024-01-01", to: "2026-01-01" },
    { preset: ["CUSTOM"], from: "invalid", to: "invalid" },
  ])("falls back atomically for invalid URL %j", (query) => {
    expect(normalizeAnalyticsDateFilter(query)).toEqual({
      preset: "30D",
      from: "",
      to: "",
    });
  });

  it("keeps presets and valid inclusive custom ranges within the API's 366-day limit", () => {
    for (const preset of ["7D", "30D", "90D"] as const) {
      expect(
        normalizeAnalyticsDateFilter({ preset, from: "old", to: "old" }),
      ).toEqual({ preset, from: "", to: "" });
    }
    expect(
      normalizeAnalyticsDateFilter({
        preset: "CUSTOM",
        from: "2024-01-01",
        to: "2024-12-31",
      }).preset,
    ).toBe("CUSTOM");
    expect(
      normalizeAnalyticsDateFilter({ from: "2026-11-01", to: "2026-11-20" }),
    ).toEqual({ preset: "CUSTOM", from: "2026-11-01", to: "2026-11-20" });
  });

  it("normalizes router navigation and never exposes empty CUSTOM state", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/report", component: { template: "<div />" } }],
    });
    await router.push(
      "/report?preset=CUSTOM&from=2026-11-01&groupBy=WEEK&paymentMethod=COD&branch=keep",
    );
    let filter!: ReturnType<typeof useAnalyticsDateFilter>;
    const wrapper = mount(
      defineComponent({
        setup() {
          filter = useAnalyticsDateFilter();
          return () => null;
        },
      }),
      { global: { plugins: [router] } },
    );
    await flushPromises();
    expect(filter.preset.value).toBe("30D");
    expect(router.currentRoute.value.query).toEqual({
      preset: "30D",
      groupBy: "WEEK",
      paymentMethod: "COD",
      branch: "keep",
    });
    filter.selectCustom({ from: "2026-11-01", to: "2026-11-20" });
    expect([filter.preset.value, filter.from.value, filter.to.value]).toEqual([
      "CUSTOM",
      "2026-11-01",
      "2026-11-20",
    ]);
    filter.selectCustom({ from: "", to: "" });
    expect([filter.preset.value, filter.from.value, filter.to.value]).toEqual([
      "30D",
      "",
      "",
    ]);
    await router.push("/report?preset=90D&groupBy=MONTH");
    await nextTick();
    expect(filter.preset.value).toBe("90D");
    await router.push("/report?preset=CUSTOM&from=2026-11-02&to=2026-11-15");
    await flushPromises();
    expect(filter.from.value).toBe("2026-11-02");
    wrapper.unmount();
  });
});
