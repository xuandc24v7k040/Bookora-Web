// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import FlashCountdown from "./FlashCountdown.vue";
import FlashSaleCard from "./FlashSaleCard.vue";
import FlashPriceInput from "./FlashPriceInput.vue";
import { newFlashRow } from "../flash-sale-form";
const variant = {
  variantId: "v",
  productId: "p",
  productName: "Sách hay",
  productSlug: "sach-hay",
  variantLabel: "Bìa mềm",
  sku: null,
  imageUrl: null,
  catalogPrice: 100000,
  globalAvailableStock: 10,
};
const item = {
  ...variant,
  id: "i",
  flashPrice: 80000,
  referencePrice: 100000,
  discountPercent: 20,
  totalQuota: 10,
  maxQuantityPerUser: 2,
  consumed: 3,
  reserved: 2,
  remaining: 5,
};
afterEach(() => vi.useRealTimers());
describe("Flash Sale client presentation", () => {
  it("uses server clock offset and emits expiry exactly once", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    const wrapper = mount(FlashCountdown, {
      props: {
        serverNow: "2026-11-18T05:00:00Z",
        endAt: "2026-11-18T05:00:02Z",
      },
    });
    expect(wrapper.text()).toContain("02");
    await vi.advanceTimersByTimeAsync(5000);
    expect(wrapper.emitted("expired")).toHaveLength(1);
    wrapper.unmount();
  });
  it("associates labeled hours/minutes/seconds without clipping long hours", () => {
    const wrapper = mount(FlashCountdown, {
      props: {
        labeled: true,
        serverNow: "2026-11-18T00:00:00Z",
        endAt: "2026-11-23T00:00:00Z",
      },
    });
    expect(wrapper.text()).toContain("120");
    for (const label of ["GIỜ", "PHÚT", "GIÂY"])
      expect(wrapper.text()).toContain(label);
    wrapper.unmount();
  });
  it("discount badge includes a lightning icon, correct variant link and honest held labels", () => {
    const wrapper = mount(FlashSaleCard, {
      props: { item },
      global: {
        stubs: {
          RouterLink: {
            props: ["to"],
            template: '<a :data-to="JSON.stringify(to)"><slot /></a>',
          },
        },
      },
    });
    expect(wrapper.find("span svg").exists()).toBe(true);
    expect(wrapper.text()).toContain("-20%");
    expect(wrapper.text()).toContain("Giữ 2");
    expect(wrapper.text()).not.toContain("Đã bán");
    expect(wrapper.attributes("data-to")).toContain("variant");
  });
  it("hides a false discount when catalog is lower than locked price", () => {
    const wrapper = mount(FlashSaleCard, {
      props: { item: { ...item, catalogPrice: 70000, discountPercent: 0 } },
      global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
    });
    expect(wrapper.find("del").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("-20%");
  });
  it("switching input modes never recomputes canonical VND", async () => {
    const row = {
      ...newFlashRow(variant),
      flashPrice: "81234",
      percent: "18.77",
    };
    const wrapper = mount(FlashPriceInput, { props: { modelValue: row } });
    await wrapper.findAll("button")[1]!.trigger("click");
    expect(row.flashPrice).toBe("81234");
    await wrapper.findAll("button")[0]!.trigger("click");
    expect(row.flashPrice).toBe("81234");
  });
});

describe("Flash Sale consumed progress and flame", () => {
  const cases = [
    [0, 10000, 10000, 0, ""],
    [100, 10000, 9900, 1, ""],
    [7000, 10000, 3000, 70, ""],
    [7001, 10000, 2999, 70.01, "Deal đang hot"],
    [8999, 10000, 1001, 89.99, "Deal đang hot"],
    [9000, 10000, 1000, 90, "Sắp cháy suất"],
    [9900, 10000, 100, 99, "Sắp cháy suất"],
    [10000, 10000, 0, 100, "Hết suất ưu đãi"],
    [11000, 10000, 0, 100, "Hết suất ưu đãi"],
    [5, 0, 0, 0, "Hết suất ưu đãi"],
    [-1, 10, 10, 0, ""],
  ] as const;
  for (const compact of [false, true]) {
    it.each(cases)(
      `maps consumed %i / quota %i with remaining %i in ${compact ? "compact" : "full"} cards`,
      (consumed, totalQuota, remaining, percent, label) => {
        const wrapper = mount(FlashSaleCard, {
          props: {
            item: { ...item, consumed, totalQuota, remaining },
            compact,
          },
          global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
        });
        expect(
          Number(
            wrapper.find('[role="progressbar"]').attributes("aria-valuenow"),
          ),
        ).toBeCloseTo(percent, 8);
        expect(wrapper.find("[data-flash-heat]").text()).toBe(label);
        const flame = wrapper.find("[data-flash-flame]");
        expect(flame.exists()).toBe(true);
        if (flame.exists()) {
          expect(flame.attributes("style")).toContain("--flash-progress:");
          expect(flame.classes()).toContain(
            "left-[clamp(7px,var(--flash-progress),calc(100%_-_7px))]",
          );
          expect(flame.classes()).toContain("pointer-events-none");
          expect(flame.classes()).toContain("fill-current");
          expect(flame.classes()).toContain("text-primary");
          expect(flame.classes()).toContain("size-5");
          expect(flame.classes()).toContain("top-[calc(50%_-_2px)]");
          expect(flame.classes()).toContain("motion-reduce:transition-none");
          expect(flame.attributes("aria-hidden")).toBe("true");
        }
        expect(wrapper.text()).toContain(`Đã dùng ${consumed}`);
        expect(wrapper.text()).toContain(`Giữ ${item.reserved}`);
        expect(wrapper.text()).not.toContain("Đã bán");
        wrapper.unmount();
      },
    );
  }
  it("counts only consumed; reserved can exhaust availability without implying sold quota", () => {
    const wrapper = mount(FlashSaleCard, {
      props: { item: { ...item, consumed: 3, reserved: 7, remaining: 0 } },
      global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
    });
    expect(
      wrapper.find('[role="progressbar"]').attributes("aria-valuenow"),
    ).toBe("30");
    expect(wrapper.find("[data-flash-heat]").text()).toBe("Hết suất ưu đãi");
    expect(wrapper.text()).toContain("Giữ 7");
    expect(wrapper.text()).not.toContain("Sắp cháy");
    wrapper.unmount();
  });
  it("moves the flame with refreshed progress and does not advertise hot offers for regular/upcoming cards", async () => {
    const wrapper = mount(FlashSaleCard, {
      props: { item: { ...item, consumed: 1, totalQuota: 100, remaining: 99 } },
      global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
    });
    const start = wrapper.find("[data-flash-flame]").attributes("style");
    await wrapper.setProps({
      item: { ...item, consumed: 99, totalQuota: 100, remaining: 1 },
    });
    expect(wrapper.find("[data-flash-flame]").attributes("style")).not.toBe(
      start,
    );
    expect(wrapper.find("[data-flash-flame]").attributes("style")).toContain(
      "99%",
    );
    expect(wrapper.find("[data-flash-heat]").text()).toBe("Sắp cháy suất");
    await wrapper.setProps({
      item: {
        ...item,
        consumed: 99,
        totalQuota: 100,
        remaining: 1,
        catalogPrice: 70000,
      },
    });
    expect(wrapper.find("[data-flash-heat]").text()).toBe("");
    await wrapper.setProps({ upcoming: true });
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    expect(wrapper.find("[data-flash-flame]").exists()).toBe(false);
    wrapper.unmount();
  });
});
