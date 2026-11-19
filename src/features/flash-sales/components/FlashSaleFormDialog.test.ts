// @vitest-environment happy-dom
import {
  DOMWrapper,
  flushPromises,
  mount,
  type VueWrapper,
} from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FlashSaleResponseDto } from "@/api/generated/models";
import FlashVariantPicker from "./FlashVariantPicker.vue";
import FlashPriceInput from "./FlashPriceInput.vue";
import FlashSaleFormDialog from "./FlashSaleFormDialog.vue";
import CouponDateTimePicker from "@/features/coupons/components/CouponDateTimePicker.vue";
import { PopoverContent } from "@/components/ui/popover";
const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));
vi.mock("vue-sonner", () => ({ toast: toastMock }));
vi.mock("./FlashVariantPicker.vue", () => ({
  default: { template: "<div />" },
}));
const sale: FlashSaleResponseDto = {
  id: "sale",
  name: "Sách hay",
  description: null,
  startAt: "2026-11-18T05:00:00.000Z",
  endAt: "2026-11-18T09:00:00.000Z",
  serverNow: "2026-11-18T04:00:00.000Z",
  status: "DRAFT",
  itemCount: 1,
  controlReason: null,
  items: [
    {
      id: "i",
      variantId: "v",
      productId: "p",
      productName: "Sách kiểm thử",
      productSlug: "sach",
      variantLabel: "Bìa mềm",
      sku: "SKU",
      imageUrl: null,
      catalogPrice: 100000,
      globalAvailableStock: 10,
      flashPrice: 80000,
      referencePrice: 100000,
      discountPercent: 20,
      totalQuota: 5,
      maxQuantityPerUser: 2,
      consumed: 0,
      reserved: 0,
      remaining: 5,
    },
  ],
};
let wrapper: VueWrapper;
function button(text: string) {
  const node = [...document.querySelectorAll<HTMLButtonElement>("button")].find(
    (b) => b.textContent?.trim() === text,
  );
  if (!node) throw new Error(`Không thấy nút ${text}`);
  return new DOMWrapper(node);
}
async function open(
  row: FlashSaleResponseDto | null = sale,
  readonly = false,
  pending = false,
) {
  wrapper = mount(FlashSaleFormDialog, {
    attachTo: document.body,
    props: { open: true, sale: row, readonly, pending, serverError: "" },
  });
  await flushPromises();
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-18T04:00:00Z"));
});
afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = "";
  vi.useRealTimers();
});
describe("Flash Sale admin dialog", () => {
  it("keeps a long multi-variant table inside the body and its horizontal region while actions remain outside", async () => {
    const items = Array.from({ length: 20 }, (_, index) => ({
      ...sale.items[0]!,
      id: `item-${index}`,
      variantId: `variant-${index}`,
      productName: `Tên sách rất dài để kiểm tra cấu hình biến thể ${index}`,
    }));
    await open({ ...sale, itemCount: items.length, items });
    const body = document.querySelector("[data-flash-sale-body]")!;
    const tableRegion = body.querySelector("[data-flash-sale-table]")!;
    expect(tableRegion.querySelectorAll("tbody tr")).toHaveLength(20);
    expect(
      document
        .querySelector('[data-slot="dialog-footer"]')
        ?.contains(button("Lưu & công bố").element),
    ).toBe(true);
    expect(body.contains(button("Lưu & công bố").element)).toBe(false);
    await button("Tất cả %").trigger("click");
    await button("Tất cả ₫").trigger("click");
    await button("Lưu nháp").trigger("click");
    expect(wrapper.emitted("save")?.[0]?.[0]).toMatchObject({
      items: items.map((item) => ({
        variantId: item.variantId,
        flashPrice: 80000,
      })),
    });
  });
  it("groups the form vertically, labels both times and keeps footer outside its only vertical body viewport", async () => {
    await open();
    const body = document.querySelector("[data-flash-sale-body]");
    expect(body?.querySelectorAll("section")).toHaveLength(3);
    expect(
      body?.querySelectorAll(
        '[data-slot="scroll-area"]:not([data-flash-sale-table])',
      ),
    ).toHaveLength(0);
    expect(
      body?.contains(document.querySelector('[data-slot="dialog-footer"]')),
    ).toBe(false);
    expect(
      document.querySelector('label[for="flash-start"]')?.textContent,
    ).toBe("Bắt đầu");
    expect(document.querySelector('label[for="flash-end"]')?.textContent).toBe(
      "Kết thúc",
    );
    expect(document.querySelector(".flash-sale-surface")).toBeNull();
    expect(
      document.querySelector('[data-slot="dialog-content"]')?.className,
    ).not.toContain("260px");
    expect(
      document
        .querySelector("[data-flash-sale-table]")
        ?.getAttribute("scrollbar-orientation"),
    ).not.toBe("vertical");
  });
  it("opens the reused date picker against the wide form body, preserves calendar/time controls and closes/reopens", async () => {
    await open();
    const trigger = document.querySelector<HTMLButtonElement>("#flash-start");
    expect(trigger).not.toBeNull();
    await new DOMWrapper(trigger!).trigger("click");
    await flushPromises();
    const picker = wrapper.findAllComponents(CouponDateTimePicker)[0]!;
    const boundary = picker
      .findComponent(PopoverContent)
      .props("collisionBoundary");
    expect(boundary).toBe(
      document.querySelector(
        '[data-flash-sale-body] [data-slot="scroll-area-viewport"]',
      ),
    );
    expect((boundary as Element).querySelector("#flash-end")).not.toBeNull();
    expect(
      document.querySelector(
        '[data-slot="popover-content"] [data-slot="calendar-grid"]',
      ),
    ).not.toBeNull();
    expect(
      document.querySelectorAll(
        '[role="radiogroup"][aria-label="Giờ"] [role="radio"]',
      ),
    ).toHaveLength(24);
    expect(
      document.querySelectorAll(
        '[role="radiogroup"][aria-label="Phút"] [role="radio"]',
      ),
    ).toHaveLength(60);
    await button("Hiện tại").trigger("click");
    await button("Xong").trigger("click");
    await flushPromises();
    expect(document.querySelector('[data-slot="popover-content"]')).toBeNull();
    expect(document.querySelector("#flash-start")?.textContent).toContain(
      "11:00",
    );
    await new DOMWrapper(trigger!).trigger("click");
    await flushPromises();
    expect(
      document.querySelector('[data-slot="popover-content"]'),
    ).not.toBeNull();
  });
  it("shows inline end-time validation without losing the draft", async () => {
    await open({ ...sale, endAt: sale.startAt });
    await button("Lưu nháp").trigger("click");
    expect(document.querySelector("#flash-end-error")?.textContent).toContain(
      "Kết thúc phải sau",
    );
    expect(
      (document.querySelector("#flash-name") as HTMLInputElement).value,
    ).toBe(sale.name);
    expect(wrapper.emitted("save")).toBeUndefined();
  });
  it("shows actionable empty state and never emits an empty program", async () => {
    await open(null);
    expect(document.body.textContent).toContain("Chưa có sản phẩm");
    await button("Lưu nháp").trigger("click");
    expect(wrapper.emitted("save")).toBeUndefined();
    expect(document.querySelector("#flash-name-error")?.textContent).toContain(
      "Vui lòng nhập tên",
    );
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "Vui lòng nhập tên",
    );
    await new DOMWrapper(
      document.querySelector<HTMLInputElement>("#flash-name")!,
    ).setValue("Tên đã nhập");
    expect(document.querySelector("#flash-name-error")).toBeNull();
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(document.body.textContent).not.toContain("Thêm sản phẩm ngay");
    expect(
      document.querySelector('[data-slot="dialog-title"]')?.textContent?.trim(),
    ).toBe("Tạo Flash Sale");
  });
  it("preserves canonical price through all-row mode switches and emits a typed draft", async () => {
    await open();
    await button("Tất cả %").trigger("click");
    await button("Tất cả ₫").trigger("click");
    await button("Lưu nháp").trigger("click");
    expect(wrapper.emitted("save")?.[0]).toMatchObject([
      {
        items: [
          {
            variantId: "v",
            flashPrice: 80000,
            totalQuota: 5,
            maxQuantityPerUser: 2,
          },
        ],
      },
      false,
    ]);
  });
  it("renders ACTIVE read-only and removes save, edit and bulk actions", async () => {
    await open({ ...sale, status: "ACTIVE" });
    const text = document.body.textContent ?? "";
    expect(text).toContain("Chi tiết Flash Sale");
    expect(text).not.toContain("Lưu nháp");
    expect(text).not.toContain("Cài nhanh");
    expect(
      (document.querySelector("#flash-name") as HTMLInputElement).disabled ||
        document.querySelector("fieldset")?.disabled,
    ).toBe(true);
  });
  it("blocks double submit while pending and retains fields after server error", async () => {
    await open(sale, false, true);
    expect(button("Lưu & công bố").attributes("disabled")).toBeDefined();
    await button("Lưu & công bố").trigger("click");
    expect(wrapper.emitted("save")).toBeUndefined();
    await wrapper.setProps({
      pending: false,
      serverError: "Quota vượt tồn khả dụng.",
    });
    expect(
      (document.querySelector("#flash-name") as HTMLInputElement).value,
    ).toBe("Sách hay");
    expect(document.body.textContent).toContain("Quota vượt tồn khả dụng.");
  });
  it("applies a fixed bulk price without blocking mixed catalogs, highlights the invalid row immediately and clears it on edit", async () => {
    await open({
      ...sale,
      itemCount: 2,
      items: [
        sale.items[0]!,
        {
          ...sale.items[0]!,
          id: "i2",
          variantId: "v2",
          productName: "Sách thứ hai",
          catalogPrice: 60000,
          flashPrice: 40000,
        },
      ],
    });
    await button("Cài nhanh").trigger("click");
    const bulk = document.querySelector("[data-flash-bulk]")!;
    const mode = bulk.querySelector('[aria-label="Cách nhập giá hàng loạt"]')!;
    await new DOMWrapper(
      [...mode.querySelectorAll("button")].find(
        (b) => b.textContent?.trim() === "₫",
      )!,
    ).trigger("click");
    await new DOMWrapper(
      document.querySelector<HTMLInputElement>("#bulk-price")!,
    ).setValue("80000");
    await new DOMWrapper(
      bulk.querySelector('[aria-label="Áp dụng giá hàng loạt"]')!,
    ).trigger("click");
    await button("Xác nhận").trigger("click");
    await flushPromises();
    const invalid =
      document.querySelector<HTMLInputElement>("#flash-price-v2")!;
    expect(invalid.value).toBe("80.000");
    expect(invalid.classList.contains("border-destructive")).toBe(true);
    expect(document.body.textContent).toContain("≥ giá gốc");
    expect(
      document
        .querySelector("#flash-price-v")
        ?.classList.contains("border-destructive"),
    ).toBe(false);
    expect(toastMock.success).toHaveBeenLastCalledWith(
      expect.stringContaining("Đã cấu hình giá Flash Sale"),
      expect.objectContaining({
        description: expect.stringContaining("1 biến thể"),
      }),
    );
    await button("Lưu nháp").trigger("click");
    expect(wrapper.emitted("save")).toBeUndefined();
    await new DOMWrapper(invalid).setValue("50000");
    expect(invalid.classList.contains("border-destructive")).toBe(false);
    expect(document.body.textContent).not.toContain("≥ giá gốc");
    await button("Lưu nháp").trigger("click");
    expect(wrapper.emitted("save")?.[0]?.[0]).toMatchObject({
      items: [
        { variantId: "v", flashPrice: 80000 },
        { variantId: "v2", flashPrice: 50000 },
      ],
    });
  });
  it("defaults numeric bulk quota/limit to one and notifies each successful apply", async () => {
    await open();
    await button("Cài nhanh").trigger("click");
    for (const id of ["quota", "limit"]) {
      const input = document.querySelector<HTMLInputElement>(`#bulk-${id}`)!;
      expect(input.type).toBe("number");
      expect(input.value).toBe("1");
    }
    await new DOMWrapper(
      document.querySelector<HTMLInputElement>("#bulk-quota")!,
    ).setValue("10");
    await new DOMWrapper(
      document.querySelector('[aria-label="Áp dụng quota hàng loạt"]')!,
    ).trigger("click");
    await button("Xác nhận").trigger("click");
    await flushPromises();
    expect(toastMock.success).toHaveBeenLastCalledWith(
      "Đã cấu hình quota 10 cho 1 biến thể.",
      undefined,
    );
    await new DOMWrapper(
      document.querySelector<HTMLInputElement>("#bulk-limit")!,
    ).setValue("3");
    await new DOMWrapper(
      document.querySelector(
        '[aria-label="Áp dụng giới hạn/khách hàng loạt"]',
      )!,
    ).trigger("click");
    await button("Xác nhận").trigger("click");
    await flushPromises();
    expect(toastMock.success).toHaveBeenLastCalledWith(
      "Đã cấu hình giới hạn/khách 3 cho 1 biến thể.",
      undefined,
    );
  });
  it("notifies mode switches, displays percent suffix and removes gray conversion background", async () => {
    await open();
    await button("Tất cả %").trigger("click");
    expect(toastMock.info).toHaveBeenLastCalledWith(
      "Đã chuyển tất cả sang chế độ nhập theo %.",
    );
    const input = document.querySelector<HTMLInputElement>(
      '[aria-label="Phần trăm giảm Sách kiểm thử"]',
    )!;
    expect(input.placeholder).toBe("0");
    expect(input.parentElement?.textContent).toContain("%");
    const caption = wrapper
      .findComponent(FlashPriceInput)
      .findAll("p")
      .find((p) => p.text().includes("="))!;
    expect(caption.classes().some((c) => c.startsWith("bg-"))).toBe(false);
    await button("Tất cả ₫").trigger("click");
    expect(toastMock.info).toHaveBeenLastCalledWith(
      "Đã chuyển tất cả sang chế độ nhập giá cố định (₫).",
    );
  });
  it("counts only added variants, then clears all with a toast and closes quick settings", async () => {
    await open();
    const variant = {
      ...sale.items[0]!,
      variantId: "new",
      productName: "Sách thêm",
    };
    wrapper
      .findComponent(FlashVariantPicker)
      .vm.$emit("add", [variant, variant, sale.items[0]!]);
    await flushPromises();
    expect(toastMock.success).toHaveBeenLastCalledWith(
      "Đã thêm thành công 1 biến thể vào chương trình.",
    );
    await button("Cài nhanh").trigger("click");
    await button("Xóa tất cả").trigger("click");
    await button("Xác nhận").trigger("click");
    await flushPromises();
    expect(document.querySelector("[data-flash-bulk]")).toBeNull();
    expect(document.body.textContent).toContain("Chưa có sản phẩm");
    expect(toastMock.success).toHaveBeenLastCalledWith(
      "Đã xóa thành công 2 biến thể khỏi chương trình.",
    );
  });
});
