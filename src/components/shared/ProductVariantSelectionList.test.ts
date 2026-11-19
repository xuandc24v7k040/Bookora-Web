// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ProductVariantSelectionList from "./ProductVariantSelectionList.vue";
const variant = {
  id: "v1",
  variantName: "Bìa mềm",
  sku: "SKU-1",
  isDefault: true,
  currentStock: 7,
};
describe("Shared receipt and Flash Sale variant selection", () => {
  it("selects simple products through the same accessible checkbox and shows global stock label", async () => {
    const wrapper = mount(ProductVariantSelectionList, {
      props: {
        variantGroups: [
          {
            productId: "p1",
            productName: "Sách hay",
            thumbnailUrl: null,
            isSimple: true,
            variants: [variant],
          },
        ],
        selectedIds: new Set<string>(),
        existingIds: [],
        expandedIds: new Set<string>(),
        stockLabel: "Tồn toàn hệ thống",
      },
    });
    expect(wrapper.text()).toContain("Tồn toàn hệ thống:");
    expect(wrapper.text()).toContain("7");
    await wrapper.find('[role="checkbox"]').trigger("click");
    expect(wrapper.emitted("toggle")?.[0]).toEqual(["v1", true]);
  });
  it("disables existing choices and keeps stock out of optioned parent headers", async () => {
    const wrapper = mount(ProductVariantSelectionList, {
      props: {
        variantGroups: [
          {
            productId: "p1",
            productName: "Sách hay",
            thumbnailUrl: null,
            isSimple: false,
            variants: [
              variant,
              { ...variant, id: "v2", variantName: "Bìa cứng" },
            ],
          },
        ],
        selectedIds: new Set(["v1"]),
        existingIds: ["v1"],
        expandedIds: new Set(["p1"]),
      },
    });
    const trigger = wrapper.find('[data-slot="collapsible-trigger"]');
    expect(trigger.text()).not.toContain("Tồn");
    expect(
      wrapper.findAll('[role="checkbox"]')[0]?.attributes("disabled"),
    ).toBeDefined();
    expect(wrapper.text()).toContain("Đã thêm");
    expect(wrapper.html()).toContain("focus-within:bg-muted/50");
  });
});
