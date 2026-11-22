// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "vue-sonner";
import type {
  CheckoutCouponDto,
  CheckoutPreviewResponseDto,
  PreviewCheckoutDto,
} from "@/api/generated/models";
import { previewCheckout } from "@/features/checkout/api/checkout-api";
import CheckoutCouponDialog from "./CheckoutCouponDialog.vue";

vi.mock("@/features/checkout/api/checkout-api", () => ({
  previewCheckout: vi.fn(),
}));
vi.mock("vue-sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const cards: CheckoutCouponDto[] = [
  {
    code: "BOOKORA10",
    minimumMembershipTier: null,
    name: "Giảm sách",
    description: null,
    type: "ORDER",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minOrderAmount: 300000,
    maxDiscount: 40000,
    discountAmount: 40000,
    selectable: true,
    reasonCode: null,
    reasonMessage: null,
  },
  {
    code: "SHIP20",
    minimumMembershipTier: null,
    name: "Giảm phí",
    description: null,
    type: "SHIPPING",
    discountType: "FIXED_AMOUNT",
    discountValue: 20000,
    minOrderAmount: 200000,
    maxDiscount: null,
    discountAmount: 20000,
    selectable: true,
    reasonCode: null,
    reasonMessage: null,
  },
  {
    code: "SHIP50",
    minimumMembershipTier: null,
    name: "Giảm phí",
    description: null,
    type: "SHIPPING",
    discountType: "FIXED_AMOUNT",
    discountValue: 50000,
    minOrderAmount: 700000,
    maxDiscount: null,
    discountAmount: 0,
    selectable: false,
    reasonCode: "COUPON_MIN_ORDER",
    reasonMessage: "Chưa đạt giá trị đơn hàng tối thiểu.",
  },
];
function response(
  payload: PreviewCheckoutDto = { selectedCartItemIds: [] },
): CheckoutPreviewResponseDto {
  const codes = [
    payload.orderCouponCode,
    payload.shippingCouponCode,
    payload.couponCode,
  ];
  return {
    availableCoupons: cards,
    appliedCoupons: cards
      .filter((card) => codes.includes(card.code))
      .map((card) => ({
        code: card.code,
        type: card.type,
        discountAmount: card.discountAmount,
      })),
    previewReference: "canonical",
    totalAmount: 470000,
  } as CheckoutPreviewResponseDto;
}
let wrapper: VueWrapper;
beforeEach(() => {
  vi.mocked(previewCheckout)
    .mockReset()
    .mockImplementation(async (payload) => response(payload));
});
afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = "";
});
async function open(): Promise<void> {
  wrapper = mount(CheckoutCouponDialog, {
    attachTo: document.body,
    props: {
      open: false,
      context: { selectedCartItemIds: ["item"] },
      contextKey: "one",
    },
    global: {
      stubs: {
        DialogTitle: { template: "<h2><slot /></h2>" },
        DialogDescription: { template: "<p><slot /></p>" },
        Dialog: { template: "<div><slot /></div>" },
        DialogContent: { template: '<div role="dialog"><slot /></div>' },
        ScrollArea: { template: "<div><slot /></div>" },
      },
    },
  });
  await wrapper.setProps({ open: true });
  await flushPromises();
}
describe("Checkout coupon draft and backend authority", () => {
  it("keeps two card skeleton groups, code form and footer while loading, then shows vouchers", async () => {
    let finish!: (value: CheckoutPreviewResponseDto) => void;
    vi.mocked(previewCheckout).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    await open();
    expect(wrapper.findAll('[data-coupon-skeleton]')).toHaveLength(2);
    expect(wrapper.get('[aria-label="Mã voucher"]').attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('Xác nhận voucher');
    expect(wrapper.text()).not.toContain('Chưa có voucher');
    finish(response());
    await flushPromises();
    expect(wrapper.findAll('[data-coupon-skeleton]')).toHaveLength(0);
    expect(wrapper.find('#voucher-BOOKORA10').exists()).toBe(true);
  });
  it("shows the approved two groups without a duplicate pricing breakdown and disables unavailable vouchers", async () => {
    await open();
    expect(wrapper.text()).toContain("Voucher giảm giá đơn hàng");
    expect(wrapper.text()).toContain("Voucher vận chuyển");
    expect(wrapper.text()).not.toMatch(/Tạm tính|Tổng thanh toán|470.000/);
    expect(wrapper.get("#voucher-SHIP50").attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain(cards[2]!.reasonMessage);
  });
  it("keeps selections as a draft until confirm and discards them on reopen", async () => {
    await open();
    await wrapper.get("#voucher-BOOKORA10").trigger("click");
    expect(wrapper.emitted("confirm")).toBeUndefined();
    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(wrapper.get("#voucher-BOOKORA10").attributes("data-state")).toBe(
      "unchecked",
    );
    await wrapper.get("#voucher-BOOKORA10").trigger("click");
    await wrapper.get("#voucher-SHIP20").trigger("click");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Xác nhận voucher")!
      .trigger("click");
    await flushPromises();
    expect(vi.mocked(previewCheckout).mock.lastCall?.[0]).toMatchObject({
      orderCouponCode: "BOOKORA10",
      shippingCouponCode: "SHIP20",
    });
    expect(wrapper.emitted("confirm")?.[0]?.[0]).toMatchObject({
      previewReference: "canonical",
      appliedCoupons: [{ code: "BOOKORA10" }, { code: "SHIP20" }],
    });
  });
  it("rejects a malformed code inline and never emits a successful confirmation on API failure", async () => {
    await open();
    await wrapper.get("input").setValue(" ");
    await wrapper.get("form").trigger("submit");
    expect(wrapper.get('[role="alert"]').text()).toContain("Nhập mã");
    vi.mocked(previewCheckout).mockRejectedValueOnce(new Error("offline"));
    await wrapper.get("input").setValue("PRIVATE25");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain("thử lại");
    expect(wrapper.emitted("confirm")).toBeUndefined();
  });
  it("ignores responses from an obsolete checkout context", async () => {
    await open();
    let resolve!: (value: CheckoutPreviewResponseDto) => void;
    vi.mocked(previewCheckout).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Xác nhận voucher")!
      .trigger("click");
    await wrapper.setProps({ contextKey: "two" });
    resolve(response());
    await flushPromises();
    expect(wrapper.emitted("confirm")).toBeUndefined();
    expect(wrapper.emitted("update:open")).toContainEqual([false]);
  });
});

describe("Sao chép voucher", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("sao chép đúng mã và giữ nguyên cả hai lựa chọn voucher", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    await open();
    await wrapper.get("#voucher-BOOKORA10").trigger("click");
    await wrapper.get("#voucher-SHIP20").trigger("click");
    const copy = wrapper.get('button[aria-label="Sao chép mã SHIP50"]');
    const bubbled = vi.fn();
    copy.element.parentElement?.addEventListener("click", bubbled);
    await copy.trigger("click");
    await flushPromises();
    expect(writeText).toHaveBeenCalledExactlyOnceWith("SHIP50");
    expect(bubbled).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledExactlyOnceWith("Đã sao chép mã SHIP50.", expect.any(Object));
    for (const code of ["BOOKORA10", "SHIP20"]) {
      expect(wrapper.get(`#voucher-${code}`).attributes("data-state")).toBe("checked");
    }
    expect(previewCheckout).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("confirm")).toBeUndefined();
    expect(wrapper.emitted("update:open")).toBeUndefined();
  });

  it("chặn click lặp trong lúc ghi clipboard và báo lỗi khi trình duyệt từ chối", async () => {
    let rejectCopy!: (error: Error) => void;
    const pendingCopy = new Promise<void>((_, reject) => { rejectCopy = reject; });
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockReturnValue(pendingCopy);
    await open();
    const copy = wrapper.get('button[aria-label="Sao chép mã BOOKORA10"]');
    await copy.trigger("click");
    await copy.trigger("click");
    expect(writeText).toHaveBeenCalledTimes(1);
    rejectCopy(new Error("Clipboard denied"));
    await flushPromises();
    expect(toast.error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("Không thể sao chép mã"), expect.any(Object));
    expect(toast.success).not.toHaveBeenCalled();
    expect(copy.attributes("disabled")).toBeUndefined();
    expect(wrapper.get("#voucher-BOOKORA10").attributes("data-state")).toBe("unchecked");
  });
});
