// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProductDescription from "./ProductDescription.vue";

let height = 640;
const disconnect = vi.fn();
beforeEach(() => {
  height = 640;
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(
    () => height,
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect = disconnect;
    },
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("product description", () => {
  it("clamps long rich text, toggles fade and collapses back to a useful scroll position", async () => {
    const wrapper = mount(ProductDescription, {
      props: {
        productId: "a",
        html: "<h2>Heading</h2><p><strong>Bold</strong></p>",
      },
    });
    await flushPromises();
    expect(wrapper.find("[data-description-fade]").exists()).toBe(true);
    await wrapper.get("button").trigger("click");
    expect(wrapper.get("button").attributes("aria-expanded")).toBe("true");
    expect(wrapper.find("[data-description-fade]").exists()).toBe(false);
    expect(wrapper.get("strong").text()).toBe("Bold");
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.spyOn(wrapper.element, "getBoundingClientRect").mockReturnValue({
      top: -500,
    } as DOMRect);
    await wrapper.get("button").trigger("click");
    expect(scroll).toHaveBeenCalled();
    expect(wrapper.get("button").text()).toBe("Xem thêm");
    wrapper.unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("hides controls on short content and resets expansion when the product changes", async () => {
    const wrapper = mount(ProductDescription, {
      props: { productId: "a", html: "<p>Long</p>" },
    });
    await flushPromises();
    await wrapper.get("button").trigger("click");
    await wrapper.setProps({ productId: "b" });
    await flushPromises();
    expect(wrapper.get("button").attributes("aria-expanded")).toBe("false");
    height = 100;
    await wrapper.setProps({ productId: "short", html: "<p>Short</p>" });
    await flushPromises();
    expect(wrapper.find("button").exists()).toBe(false);
    expect(wrapper.find("[data-description-fade]").exists()).toBe(false);
    wrapper.unmount();
  });
});
