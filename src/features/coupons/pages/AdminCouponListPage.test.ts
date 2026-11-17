// @vitest-environment happy-dom
import { DOMWrapper, flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CouponResponseDto } from "@/api/generated/models";
import { useAdminCoupons } from "../use-admin-coupons";
import AdminCouponListPage from "./AdminCouponListPage.vue";

vi.mock("../use-admin-coupons", () => ({ useAdminCoupons: vi.fn() }));
vi.mock("vue-sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const coupon: CouponResponseDto = {
  id: "01M7KYTQTWDAC7GNMQFVXKR5QD",
  code: "BOOKORA10",
  name: "Ưu đãi sách",
  description: null,
  type: "ORDER",
  visibility: "PUBLIC",
  discountType: "PERCENTAGE",
  discountValue: 10,
  minOrderAmount: 300000,
  maxDiscount: 40000,
  usageLimit: 100,
  usageLimitPerUser: 1,
  startAt: "2026-11-01T00:00:00Z",
  endAt: "2026-12-01T00:00:00Z",
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
  isActive: true,
  status: "ACTIVE",
  consumed: 0,
  reserved: 0,
  remaining: 100,
};
const pending = ref(false);
const mutateAsync = vi.fn();
let wrapper: VueWrapper;

const passthrough = defineComponent({
  setup: (_, { slots }) => () => h("div", slots.default?.()),
});
const menuItem = defineComponent({
  emits: ["select"],
  setup: (_, { slots, emit }) => () =>
    h("button", { onClick: () => emit("select") }, slots.default?.()),
});
function button(text: string): DOMWrapper<HTMLButtonElement> {
  const element = [...document.querySelectorAll("button")].find(
    (node) => node.textContent?.trim() === text,
  );
  if (!element) throw new Error(`Không thấy nút ${text}`);
  return new DOMWrapper(element);
}
async function openConfirmation(isActive: boolean): Promise<void> {
  wrapper = mount(AdminCouponListPage, {
    attachTo: document.body,
    global: {
      stubs: {
        AdminBreadcrumb: true,
        CouponFormDialog: true,
        DataTable: defineComponent({
          setup: (_, { slots }) => () =>
            h("div", slots["row-actions"]?.({ rowData: { ...coupon, isActive } })),
        }),
        DropdownMenu: passthrough,
        DropdownMenuTrigger: passthrough,
        DropdownMenuContent: passthrough,
        DropdownMenuItem: menuItem,
      },
    },
  });
  await button(isActive ? "Tạm dừng mã" : "Kích hoạt mã").trigger("click");
  await flushPromises();
  expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
}
beforeEach(() => {
  pending.value = false;
  mutateAsync.mockReset().mockResolvedValue(undefined);
  vi.mocked(useAdminCoupons).mockReturnValue({
    query: { data: ref(undefined), isFetching: ref(false), error: ref(null), refetch: vi.fn() },
    save: { isPending: ref(false), mutateAsync: vi.fn() },
    active: { isPending: pending, mutateAsync },
    detail: vi.fn(),
  } as unknown as ReturnType<typeof useAdminCoupons>);
});
afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = "";
});

describe("Coupon activation confirmation with the real AlertDialog", () => {
  it.each([true, false])("sends the inverse of isActive=%s for the selected coupon", async (isActive) => {
    await openConfirmation(isActive);
    await button("Xác nhận").trigger("click");
    await flushPromises();
    expect(mutateAsync).toHaveBeenCalledExactlyOnceWith({ id: coupon.id, isActive: !isActive });
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it("keeps the target and disables confirmation until the request settles", async () => {
    let finish!: () => void;
    mutateAsync.mockImplementation(() => {
      pending.value = true;
      return new Promise<void>((resolve) => { finish = resolve; });
    });
    await openConfirmation(true);
    await button("Xác nhận").trigger("click");
    await flushPromises();
    expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain(coupon.code);
    expect(button("Đang cập nhật...").element.disabled).toBe(true);
    expect(button("Hủy bỏ").element.disabled).toBe(true);
    pending.value = false;
    finish();
    await flushPromises();
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it("allows retry after a failed update and sends nothing when canceled", async () => {
    await openConfirmation(false);
    await button("Hủy bỏ").trigger("click");
    await flushPromises();
    expect(mutateAsync).not.toHaveBeenCalled();
    await button("Kích hoạt mã").trigger("click");
    await flushPromises();
    mutateAsync.mockRejectedValueOnce(new Error("offline"));
    await button("Xác nhận").trigger("click");
    await flushPromises();
    expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain(coupon.code);
    await button("Xác nhận").trigger("click");
    await flushPromises();
    expect(mutateAsync).toHaveBeenNthCalledWith(2, { id: coupon.id, isActive: true });
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });
});
