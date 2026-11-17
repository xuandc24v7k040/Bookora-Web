// @vitest-environment happy-dom
import { DOMWrapper, flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CouponResponseDto } from "@/api/generated/models";
import CouponFormDialog from "./CouponFormDialog.vue";

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
  startAt: "2026-11-10T11:18:39.321Z",
  endAt: "2026-11-12T11:18:40.123Z",
  createdAt: "2026-11-10T00:00:00.000Z",
  updatedAt: "2026-11-10T00:00:00.000Z",
  isActive: false,
  status: "INACTIVE",
  consumed: 0,
  reserved: 0,
  remaining: 100,
};
let wrapper: VueWrapper;

function element<T extends HTMLElement>(selector: string): DOMWrapper<T> {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Không thấy ${selector}`);
  return new DOMWrapper(node);
}

function pickerButton(label: string): DOMWrapper<HTMLButtonElement> {
  const node = Array.from(document.querySelectorAll<HTMLButtonElement>(
    '[data-slot="popover-content"] button',
  )).find((button) => button.textContent?.trim() === label);
  if (!node) throw new Error(`Không thấy nút ${label}`);
  return new DOMWrapper(node);
}

async function openForm(row: CouponResponseDto | null = null) {
  wrapper = mount(CouponFormDialog, {
    attachTo: document.body,
    props: { open: true, coupon: row, pending: false, serverError: "" },
  });
  await flushPromises();
  if (!row) {
    await element<HTMLInputElement>("#coupon-code").setValue("BOOKORA10");
    await element<HTMLInputElement>("#coupon-name").setValue("Ưu đãi sách");
    await element<HTMLInputElement>("#coupon-value").setValue("20000");
  }
}

async function openPicker(field: "startAt" | "endAt") {
  await element(`#coupon-${field}`).trigger("click");
  await flushPromises();
}

async function selectMinute(minute: string) {
  const node = Array.from(document.querySelectorAll<HTMLButtonElement>(
    '[role="radiogroup"][aria-label="Phút"] [role="radio"]',
  )).find((button) => button.textContent?.trim() === minute);
  if (!node) throw new Error(`Không thấy phút ${minute}`);
  await new DOMWrapper(node).trigger("click");
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-17T11:18:53.000Z"));
});

afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("Thời gian và trạng thái trên form voucher", () => {
  it("bắt đầu ở phút hiện tại và Hiện tại dùng đúng ngày Việt Nam cuối ngày", async () => {
    vi.setSystemTime(new Date("2026-11-17T16:59:58.000Z"));
    await openForm();
    expect(element("#coupon-startAt").text()).toBe("23:59 17-11-2026");
    await openPicker("startAt");
    await pickerButton("Hiện tại").trigger("click");
    await pickerButton("Xong").trigger("click");
    await element("#coupon-form").trigger("submit");
    expect(wrapper.emitted("save")?.[0]?.[0]).toMatchObject({
      startAt: "2026-11-17T16:59:00.000Z",
      isActive: true,
    });
  });

  it("từ chối phút đã qua cùng ngày, rồi xác nhận lại trong cùng phút", async () => {
    await openForm();
    await openPicker("startAt");
    await selectMinute("17");
    await pickerButton("Xong").trigger("click");
    expect(element('[data-slot="popover-content"] [role="alert"]').text())
      .toContain("bắt đầu không được ở quá khứ");
    await pickerButton("Hiện tại").trigger("click");
    await pickerButton("Xong").trigger("click");
    await element("#coupon-form").trigger("submit");
    expect(wrapper.emitted("save")).toHaveLength(1);
    expect(element("#coupon-startAt").text()).toBe("18:18 17-11-2026");
  });

  it("chọn ngày và giờ trong picker, rồi gửi đúng ISO UTC", async () => {
    await openForm();
    await openPicker("startAt");
    expect(element('[data-reka-calendar-cell-trigger][data-value="2026-11-16"]')
      .attributes("aria-disabled")).toBe("true");
    await element('[data-reka-calendar-cell-trigger][data-value="2026-11-18"]').trigger("click");
    const hour = Array.from(document.querySelectorAll<HTMLButtonElement>(
      '[role="radiogroup"][aria-label="Giờ"] [role="radio"]',
    )).find((button) => button.textContent?.trim() === "07");
    if (!hour) throw new Error("Không thấy giờ 07");
    await new DOMWrapper(hour).trigger("click");
    await selectMinute("22");
    await pickerButton("Xong").trigger("click");
    expect(element("#coupon-startAt").text()).toBe("07:22 18-11-2026");
    await element("#coupon-form").trigger("submit");
    expect(wrapper.emitted("save")?.[0]?.[0]).toMatchObject({ startAt: "2026-11-18T00:22:00.000Z" });
  });

  it("kiểm tra đồng hồ tại lúc lưu và ngăn gửi khi đang lưu", async () => {
    await openForm();
    vi.setSystemTime(new Date("2026-11-17T11:19:00.000Z"));
    await element("#coupon-form").trigger("submit");
    expect(element("#coupon-startAt-error").text()).toContain("quá khứ");
    expect(wrapper.emitted("save")).toBeUndefined();
    await openPicker("startAt");
    await pickerButton("Hiện tại").trigger("click");
    await pickerButton("Xong").trigger("click");
    expect(document.querySelector("#coupon-startAt-error")).toBeNull();
    await wrapper.setProps({ pending: true });
    await element("#coupon-form").trigger("submit");
    expect(wrapper.emitted("save")).toBeUndefined();
    expect(element<HTMLButtonElement>("#coupon-active").element.disabled).toBe(true);
  });

  it("đổi Switch nhưng giữ chính xác hai timestamp lịch sử và chịu được lỗi API", async () => {
    await openForm(coupon);
    const active = element("#coupon-active");
    expect(active.attributes("aria-checked")).toBe("false");
    await active.trigger("click");
    await element("#coupon-form").trigger("submit");
    expect(wrapper.emitted("save")?.[0]?.[0]).toMatchObject({
      startAt: coupon.startAt,
      endAt: coupon.endAt,
      isActive: true,
    });
    await wrapper.setProps({ serverError: "Không thể lưu. Vui lòng thử lại." });
    expect(element('[role="alert"]').text()).toContain("Không thể lưu");
    expect(element("#coupon-startAt").text()).toBe("18:18 10-11-2026");
    expect(active.attributes("aria-checked")).toBe("true");
  });

  it("báo kết thúc khi đổi bắt đầu trùng và xóa lỗi sau khi sửa kết thúc", async () => {
    await openForm({ ...coupon, endAt: "2026-11-17T11:18:00.000Z" });
    await openPicker("startAt");
    await pickerButton("Hiện tại").trigger("click");
    await pickerButton("Xong").trigger("click");
    expect(element("#coupon-endAt-error").text()).toContain("kết thúc phải sau");
    await openPicker("endAt");
    await pickerButton("Xong").trigger("click");
    expect(element('[data-slot="popover-content"] [role="alert"]').text())
      .toContain("kết thúc phải sau");
    await selectMinute("17");
    await pickerButton("Xong").trigger("click");
    expect(element('[data-slot="popover-content"] [role="alert"]').text())
      .toContain("kết thúc phải sau");
    await selectMinute("19");
    await pickerButton("Xong").trigger("click");
    expect(document.querySelector("#coupon-endAt-error")).toBeNull();
    await element("#coupon-form").trigger("submit");
    expect(wrapper.emitted("save")?.[0]?.[0]).toMatchObject({
      startAt: "2026-11-17T11:18:00.000Z",
      endAt: "2026-11-17T11:19:00.000Z",
    });
  });

  it("bỏ bản nháp picker khi đóng, rồi reset Switch khi mở form mới", async () => {
    await openForm(coupon);
    await openPicker("startAt");
    await pickerButton("Hiện tại").trigger("click");
    await element("#coupon-startAt").trigger("click");
    await openPicker("startAt");
    await pickerButton("Xong").trigger("click");
    expect(element("#coupon-startAt").text()).toBe("18:18 10-11-2026");
    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true, coupon: null });
    await flushPromises();
    expect(element("#coupon-active").attributes("aria-checked")).toBe("true");
    expect(element("#coupon-startAt").text()).toBe("18:18 17-11-2026");
  });
});
