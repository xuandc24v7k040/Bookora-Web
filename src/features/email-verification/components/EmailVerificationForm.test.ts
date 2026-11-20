// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EmailVerificationForm from "./EmailVerificationForm.vue";

const verify = vi.hoisted(() => vi.fn());
const resend = vi.hoisted(() => vi.fn());
vi.mock("../api/email-verification-api", () => ({ verifyEmail: verify, resendVerification: resend }));
vi.mock("vue-sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const wrappers: ReturnType<typeof mount>[] = [];

async function form(path = "/verify-email", props = {}) {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: "/verify-email", component: {} }, { path: "/login", name: "customer-login", component: {} },
  ] });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(EmailVerificationForm, { props, global: { plugins: [router] } });
  wrappers.push(wrapper);
  await flushPromises();
  return { wrapper, router };
}
function apiError(code: string, status = 400) { return { isAxiosError: true, response: { status, data: { code } } }; }

beforeEach(() => { verify.mockReset(); resend.mockReset(); });
afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); vi.useRealTimers(); });

describe("Email verification", () => {
  it("reuses the Auth form width, shows inbox and truthful delivery failure with retry", async () => {
    const { wrapper } = await form("/verify-email", { initialEmail: "reader@example.test", delivery: "FAILED" });
    expect(wrapper.text()).toContain("Tài khoản đã được tạo nhưng chưa gửi được email");
    expect(wrapper.get("#verification-email").element).toHaveProperty("value", "reader@example.test");
    expect(wrapper.html()).toContain("max-w-[480px]");
    expect(wrapper.get('a[href="/login"]').text()).toContain("Quay lại đăng nhập");
    expect(verify).not.toHaveBeenCalled();
  });

  it("clears the fragment before API verification and only then renders success", async () => {
    let resolve!: (value: { success: boolean }) => void;
    verify.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const token = "a".repeat(43);
    const { wrapper, router } = await form(`/verify-email#token=${token}`);
    expect(router.currentRoute.value.hash).toBe("");
    expect(verify).toHaveBeenCalledWith(token);
    expect(wrapper.text()).toContain("Đang xác minh email");
    expect(wrapper.text()).not.toContain("Xác minh email thành công");
    resolve({ success: true });
    await flushPromises();
    expect(wrapper.text()).toContain("Xác minh email thành công");
    expect(wrapper.find("form").exists()).toBe(false);
    expect(wrapper.html()).not.toContain(token);
  });

  it.each(["EXPIRED", "USED", "REVOKED", "INVALID", "ALREADY_VERIFIED"])("handles %s without false success", async (status) => {
    verify.mockRejectedValue(apiError(`EMAIL_VERIFICATION_${status}`));
    const { wrapper } = await form(`/verify-email#token=${"a".repeat(43)}`);
    expect(wrapper.text()).toContain("Không thể xác minh email");
    expect(wrapper.find("form").exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Xác minh email thành công");
  });

  it("rejects malformed links without calling the API, and validates resend email", async () => {
    const { wrapper, router } = await form("/verify-email?token=bad");
    expect(router.currentRoute.value.query.token).toBeUndefined();
    expect(verify).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("không hợp lệ");
    await wrapper.get("form").trigger("submit");
    expect(resend).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Vui lòng nhập email đúng định dạng");
  });

  it("resends once, uses the server cooldown and allows retry after the countdown", async () => {
    const { wrapper } = await form("/verify-email", { initialEmail: "reader@example.test" });
    vi.useFakeTimers();
    resend.mockResolvedValue({ success: true, message: "Yêu cầu đã được tiếp nhận", resendCooldownSeconds: 3 });
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(wrapper.text()).toContain("Gửi lại sau 3s");
    await wrapper.get("form").trigger("submit");
    expect(resend).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3000);
    expect(wrapper.get('button[type="submit"]').attributes("disabled")).toBeUndefined();
    expect(wrapper.text()).toContain("Gửi lại email xác minh");
  });

  it("allows a network-error retry with the in-memory token", async () => {
    verify.mockRejectedValueOnce(new Error("Network"));
    const { wrapper } = await form(`/verify-email#token=${"a".repeat(43)}`);
    verify.mockResolvedValue({ success: true });
    await wrapper.get("button").trigger("click");
    await flushPromises();
    expect(verify).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("Xác minh email thành công");
  });
});
