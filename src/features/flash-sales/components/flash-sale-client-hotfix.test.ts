// @vitest-environment happy-dom
import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import FlashSalePage from "../pages/FlashSalePage.vue";
import HomeFlashSale from "./HomeFlashSale.vue";
const mock = vi.hoisted(() => ({ use: vi.fn() }));
vi.mock("../api/flash-sale-api", () => ({ useFlashSales: mock.use }));
const item = {
  id: "i",
  variantId: "v",
  productSlug: "book",
  productName: "Sách hay",
  variantLabel: "Bìa mềm",
  catalogPrice: 100000,
  flashPrice: 80000,
  discountPercent: 20,
  totalQuota: 10,
  remaining: 8,
  consumed: 1,
  reserved: 1,
  imageUrl: null,
};
const sale = {
  id: "s",
  name: "Giờ vàng",
  startAt: "2030-01-01T00:00:00Z",
  endAt: "2030-01-01T02:00:00Z",
  serverNow: "2030-01-01T00:00:00Z",
  items: [item],
};
let wrapper: VueWrapper;
afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = "";
});
function queries(count = 0, homeCount = 1) {
  mock.use.mockImplementation((params) => ({
    data: ref({
      items:
        params.value.status === "ACTIVE"
          ? [
              {
                ...sale,
                items: Array.from({ length: homeCount }, (_, i) => ({
                  ...item,
                  id: String(i),
                })),
              },
            ]
          : count
            ? [{ ...sale, id: "upcoming" }]
            : [],
      totalItems: params.value.status === "ACTIVE" ? 1 : count,
      totalPages: 1,
    }),
    isPending: ref(false),
    isError: ref(false),
    refetch: vi.fn(),
  }));
}
const global = {
  stubs: { RouterLink: { props: ["to"], template: "<a><slot /></a>" } },
};
describe("Client Flash Sale hotfix", () => {
  it("keeps hero outside tab panels, one labeled countdown and centered upcoming empty state", async () => {
    queries();
    wrapper = mount(FlashSalePage, { attachTo: document.body, global });
    expect(wrapper.findAll('[role="timer"]')).toHaveLength(1);
    for (const unit of ["GIỜ", "PHÚT", "GIÂY"])
      expect(wrapper.text()).toContain(unit);
    expect(wrapper.text()).toContain("Kết thúc lúc");
    expect(
      wrapper.find('[role="progressbar"]').attributes("aria-valuenow"),
    ).toBe("10");
    expect(wrapper.find("[data-flash-flame]").exists()).toBe(true);
    const hero = wrapper.find("section").element;
    const triggers = wrapper.findAll('[role="tab"]');
    await triggers[1]!.trigger("mousedown", { button: 0, ctrlKey: false });
    await flushPromises();
    expect(wrapper.find("section").element).toBe(hero);
    expect(wrapper.findAll('[role="timer"]')).toHaveLength(0);
    expect(wrapper.text()).toContain(
      "Chưa có chương trình Flash Sale sắp diễn ra",
    );
    expect(
      wrapper.find('[role="tabpanel"]').attributes("aria-labelledby"),
    ).toBe("flash-tab-SCHEDULED");
    expect(triggers[1]!.attributes("aria-selected")).toBe("true");
    await triggers[0]!.trigger("mousedown", { button: 0, ctrlKey: false });
    await flushPromises();
    expect(wrapper.findAll('[role="timer"]')).toHaveLength(1);
  });
  it("renders real upcoming previews with start time and no early purchase CTA", async () => {
    queries(1);
    wrapper = mount(FlashSalePage, { global });
    await wrapper
      .findAll('[role="tab"]')[1]!
      .trigger("mousedown", { button: 0, ctrlKey: false });
    await flushPromises();
    expect(wrapper.text()).toContain("Bắt đầu lúc");
    expect(wrapper.text()).toContain("Giá ưu đãi áp dụng khi bắt đầu");
    expect(wrapper.text()).not.toContain("Chưa có chương trình");
    expect(wrapper.findAll('[role="timer"]')).toHaveLength(0);
  });
  it.each([1, 2, 6])(
    "uses the shared carousel for %i products, including small sets",
    (count) => {
      queries(0, count);
      wrapper = mount(HomeFlashSale, { global });
      expect(wrapper.findAll("a.group")).toHaveLength(count);
      expect(wrapper.findAll("[data-flash-flame]")).toHaveLength(count);
      expect(
        wrapper.find('[role="progressbar"]').attributes("aria-valuenow"),
      ).toBe("10");
      expect(wrapper.find('[aria-roledescription="carousel"]').exists()).toBe(
        true,
      );
      expect(wrapper.find("a.group").classes()).toContain("flash-sale-surface");
      expect(wrapper.find("a.group span").classes()).toContain("bg-primary/10");
    },
  );
  it("uses native horizontal scrolling, mouse wheel and overflow-only controls without clipping hover space", async () => {
    queries(0, 6);
    wrapper = mount(HomeFlashSale, { global });
    const region = wrapper.find("[data-flash-scroller]");
    const element = region.element as HTMLElement;
    Object.defineProperties(element, {
      clientWidth: { value: 300, configurable: true },
      scrollWidth: { value: 1800, configurable: true },
    });
    const scrollBy = vi.fn((options: ScrollToOptions) => {
      element.scrollLeft += Number(options.left ?? 0);
      element.dispatchEvent(new Event("scroll"));
    });
    Object.defineProperty(element, "scrollBy", {
      value: scrollBy,
      configurable: true,
    });
    await region.trigger("scroll");
    expect(
      wrapper.find('[aria-label="Xem Flash Sale tiếp theo"]').exists(),
    ).toBe(true);
    expect(region.classes()).toContain("overflow-x-auto");
    expect(region.classes()).toContain("py-3");
    expect(wrapper.find('[role="timer"]').text()).toContain("GIỜ");
    expect(wrapper.find('[role="timer"]').text()).toContain("PHÚT");
    expect(wrapper.find('[role="timer"]').text()).toContain("GIÂY");
    const wheel = new WheelEvent("wheel", {
      deltaY: 160,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(wheel);
    await flushPromises();
    expect(wheel.defaultPrevented).toBe(true);
    expect(scrollBy).toHaveBeenCalledWith({ left: 160, behavior: "auto" });
    element.scrollLeft = 1500;
    const end = new WheelEvent("wheel", {
      deltaY: 160,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(end);
    expect(end.defaultPrevented).toBe(false);
  });
});
