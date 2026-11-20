import { beforeEach, describe, expect, it, vi } from "vitest";
import { withAuthCsrfRecovery } from "./auth-csrf-request";
const clear = vi.hoisted(() => vi.fn());
const csrf = vi.hoisted(() => vi.fn());
vi.mock("@/api/http/csrf-manager", () => ({ clearCsrfToken: clear, getCsrfToken: csrf }));
const csrfError = { isAxiosError: true, response: { status: 403, data: { code: "CSRF_INVALID" } } };
beforeEach(() => { clear.mockReset(); csrf.mockReset().mockResolvedValue("fresh"); });
describe("Auth CSRF recovery after verification in another tab", () => {
  it("bootstraps a fresh CSRF token and retries the guard-rejected request once", async () => {
    const request = vi.fn().mockRejectedValueOnce(csrfError).mockResolvedValue("ok");
    await expect(withAuthCsrfRecovery(request)).resolves.toBe("ok");
    expect(clear).toHaveBeenCalledTimes(1);
    expect(csrf).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("does not loop when the retry fails", async () => {
    const request = vi.fn().mockRejectedValue(csrfError);
    await expect(withAuthCsrfRecovery(request)).rejects.toBe(csrfError);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it.each([400, 401, 403, 429, 500])("does not retry other errors with status %s", async (status) => {
    const request = vi.fn().mockRejectedValue({ isAxiosError: true, response: { status, data: { code: "OTHER_ERROR" } } });
    await expect(withAuthCsrfRecovery(request)).rejects.toBeDefined();
    expect(request).toHaveBeenCalledTimes(1);
    expect(csrf).not.toHaveBeenCalled();
  });
});
