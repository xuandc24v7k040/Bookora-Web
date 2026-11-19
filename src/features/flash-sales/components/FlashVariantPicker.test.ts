// @vitest-environment happy-dom
import {
  DOMWrapper,
  flushPromises,
  mount,
  type VueWrapper,
} from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  FlashSaleResponseDto,
  FlashSaleVariantDto,
} from "@/api/generated/models";
import FlashVariantPicker from "./FlashVariantPicker.vue";
import FlashSaleFormDialog from "./FlashSaleFormDialog.vue";
const list = vi.hoisted(() => vi.fn());
vi.mock("../api/flash-sale-api", () => ({ listFlashVariants: list }));
const simple: FlashSaleVariantDto = {
  variantId: "simple",
  productId: "p1",
  productName: "Sách bìa mềm",
  productSlug: "sach-mem",
  variantLabel: "Bìa mềm",
  sku: "SKU-1",
  imageUrl: null,
  catalogPrice: 100000,
  globalAvailableStock: 8,
  isSimple: true,
};
const option = {
  ...simple,
  variantId: "option-a",
  productId: "p2",
  productName: "Sách tùy chọn",
  isSimple: false,
};
const existing = {
  ...simple,
  variantId: "existing",
  productId: "p3",
  productName: "Sách đã thêm",
};
let wrapper: VueWrapper;
let client: QueryClient;
function button(label: string) {
  const node = [...document.querySelectorAll<HTMLButtonElement>("button")].find(
    (b) =>
      b.textContent?.trim() === label || b.getAttribute("aria-label") === label,
  );
  if (!node) throw new Error(`Không thấy nút ${label}`);
  return new DOMWrapper(node);
}
async function loaded() {
  await flushPromises();
  await vi.waitFor(() =>
    expect(document.body.textContent).not.toContain("Đang tải biến thể..."),
  );
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-18T04:00:00Z"));
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  list.mockReset();
  list.mockImplementation((params: { page: number; search?: string }) =>
    Promise.resolve({
      items: params.search
        ? [simple]
        : params.page === 2
          ? [
              {
                ...simple,
                variantId: "page-two",
                productId: "p4",
                productName: "Trang hai",
              },
            ]
          : [
              simple,
              option,
              { ...option, variantId: "option-b", variantLabel: "Bìa cứng" },
              existing,
            ],
      page: params.page,
      limit: 20,
      totalItems: 5,
      totalPages: 2,
    }),
  );
});
afterEach(() => {
  wrapper?.unmount();
  client.clear();
  document.body.innerHTML = "";
  vi.useRealTimers();
});
describe("Flash Sale variant picker", () => {
  it("keeps pagination, count and actions outside the bounded list; preserves selection across pages and confirms", async () => {
    wrapper = mount(FlashVariantPicker, {
      attachTo: document.body,
      props: { open: true, existing: ["existing"] },
      global: { plugins: [[VueQueryPlugin, { queryClient: client }]] },
    });
    await loaded();
    const content = document.querySelector('[data-slot="dialog-content"]')!;
    const listRegion = document.querySelector("[data-flash-variant-list]")!;
    const footer = document.querySelector('[data-slot="dialog-footer"]')!;
    expect(listRegion.contains(footer)).toBe(false);
    expect(footer.parentElement).toBe(content);
    expect(content.className).toContain("minmax(0,1fr)");
    expect(button("Thêm 0 biến thể").attributes("disabled")).toBeDefined();
    expect(document.body.textContent).not.toContain("Chọn tất cả trên trang");
    await button("Chọn Sách bìa mềm").trigger("click");
    const expand = document.querySelector<HTMLButtonElement>(
      '[data-slot="collapsible-trigger"]',
    )!;
    await new DOMWrapper(expand).trigger("click");
    await button("Chọn Sách tùy chọn — Bìa mềm").trigger("click");
    await button("Chọn Sách tùy chọn — Bìa cứng").trigger("click");
    expect(footer.textContent).toContain("Đã chọn 3 biến thể");
    expect(
      listRegion
        .querySelector('[aria-label="Chọn Sách đã thêm"]')
        ?.getAttribute("disabled"),
    ).not.toBeNull();
    await button("Trang sau").trigger("click");
    await loaded();
    await button("Chọn Trang hai").trigger("click");
    expect(footer.textContent).toContain("Đã chọn 4 biến thể");
    await button("Trang trước").trigger("click");
    await loaded();
    expect(
      document
        .querySelector('[aria-label="Chọn Sách bìa mềm"]')
        ?.getAttribute("aria-checked"),
    ).toBe("true");
    await button("Thêm 4 biến thể").trigger("click");
    expect(wrapper.emitted("add")?.[0]?.[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ variantId: "simple" }),
        expect.objectContaining({ variantId: "page-two" }),
      ]),
    );
    expect(wrapper.emitted("update:open")?.at(-1)).toEqual([false]);
  });
  it("expands optioned groups, filters by server search and resets transient selection on reopen", async () => {
    wrapper = mount(FlashVariantPicker, {
      attachTo: document.body,
      props: { open: true, existing: [] },
      global: { plugins: [[VueQueryPlugin, { queryClient: client }]] },
    });
    await loaded();
    const trigger = [
      ...document.querySelectorAll<HTMLButtonElement>(
        '[data-slot="collapsible-trigger"]',
      ),
    ].find((b) => b.textContent?.includes("Sách tùy chọn"))!;
    await new DOMWrapper(trigger).trigger("click");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    await button("Chọn Sách tùy chọn — Bìa cứng").trigger("click");
    expect(document.querySelector('[role="status"]')?.textContent).toContain(
      "1",
    );
    await new DOMWrapper(
      document.querySelector<HTMLInputElement>('[aria-label="Tìm biến thể"]')!,
    ).setValue("SKU-1");
    await loaded();
    expect(list).toHaveBeenLastCalledWith(
      { page: 1, search: "SKU-1" },
      expect.any(AbortSignal),
    );
    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    await loaded();
    expect(document.querySelector('[role="status"]')?.textContent).toContain(
      "0",
    );
  });
  it("closes the nested picker without losing parent fields, then adds a variant to the same draft", async () => {
    const sale: FlashSaleResponseDto = {
      id: "draft",
      name: "Tên ban đầu",
      description: "",
      startAt: "2026-11-18T05:00:00Z",
      endAt: "2026-11-18T08:00:00Z",
      serverNow: "2026-11-18T04:00:00Z",
      status: "DRAFT",
      itemCount: 0,
      items: [],
      controlReason: null,
    };
    wrapper = mount(FlashSaleFormDialog, {
      attachTo: document.body,
      props: {
        open: true,
        sale,
        readonly: false,
        pending: false,
        serverError: "",
      },
      global: { plugins: [[VueQueryPlugin, { queryClient: client }]] },
    });
    await flushPromises();
    await new DOMWrapper(
      document.querySelector<HTMLInputElement>("#flash-name")!,
    ).setValue("Bản nháp đang nhập");
    await button("Thêm sản phẩm").trigger("click");
    await loaded();
    expect(
      document.querySelectorAll('[data-slot="dialog-content"]'),
    ).toHaveLength(2);
    const childFooter = document
      .querySelector("[data-flash-variant-list]")!
      .closest('[data-slot="dialog-content"]')!
      .querySelector('[data-slot="dialog-footer"]')!;
    const close = [
      ...childFooter.querySelectorAll<HTMLButtonElement>("button"),
    ].find((b) => b.textContent?.trim() === "Đóng")!;
    await new DOMWrapper(close).trigger("click");
    await flushPromises();
    await vi.waitFor(() =>
      expect(
        document.querySelectorAll('[data-slot="dialog-content"]'),
      ).toHaveLength(1),
    );
    expect(document.activeElement?.textContent?.trim()).toContain(
      "Thêm sản phẩm",
    );
    expect(
      (document.querySelector("#flash-name") as HTMLInputElement).value,
    ).toBe("Bản nháp đang nhập");
    await button("Thêm sản phẩm").trigger("click");
    await loaded();
    await new DOMWrapper(
      document
        .querySelector("[data-flash-variant-list]")!
        .closest('[data-slot="dialog-content"]')!,
    ).trigger("keydown", { key: "Escape", code: "Escape" });
    await vi.waitFor(() =>
      expect(
        document.querySelectorAll('[data-slot="dialog-content"]'),
      ).toHaveLength(1),
    );
    expect(document.activeElement?.textContent?.trim()).toContain(
      "Thêm sản phẩm",
    );
    await button("Thêm sản phẩm").trigger("click");
    await loaded();
    await button("Chọn Sách bìa mềm").trigger("click");
    await button("Thêm 1 biến thể").trigger("click");
    await flushPromises();
    await new DOMWrapper(
      document.querySelector<HTMLInputElement>("#flash-price-simple")!,
    ).setValue("65000");
    await button("Lưu nháp").trigger("click");
    expect(wrapper.emitted("save")?.[0]?.[0]).toMatchObject({
      name: "Bản nháp đang nhập",
      items: [{ variantId: "simple", flashPrice: 65000 }],
    });
  });
});
