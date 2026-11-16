// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ReviewMediaGallery from "./ReviewMediaGallery.vue";

describe("Ảnh đánh giá", () => {
  it.each([0, 1, 2, 3, 4])(
    "hiển thị %s ảnh với counter đúng và mở đúng lightbox index",
    async (count) => {
      const media = Array.from({ length: count }, (_, index) => ({
        id: `${index}`,
        url: `https://cdn/${index}.webp`,
        sortOrder: index,
      }));
      const wrapper = mount(ReviewMediaGallery, {
        props: { media },
        global: {
          stubs: {
            VueEasyLightbox: {
              name: "VueEasyLightbox",
              props: ["visible", "imgs", "index"],
              template: '<div data-testid="lightbox" />',
            },
          },
        },
      });
      const buttons = wrapper.findAll("button");
      expect(buttons).toHaveLength(Math.min(count, 3));
      expect(wrapper.text()).toBe(count >= 3 ? `+${count - 2}` : "");
      if (count) {
        await buttons[buttons.length - 1]!.trigger("click");
        const lightbox = wrapper.findComponent({ name: "VueEasyLightbox" });
        expect(lightbox.props("index")).toBe(Math.min(count, 3) - 1);
        expect(lightbox.props("imgs")).toHaveLength(count);
        expect(lightbox.props("visible")).toBe(true);
      }
      wrapper.unmount();
    },
  );
});
