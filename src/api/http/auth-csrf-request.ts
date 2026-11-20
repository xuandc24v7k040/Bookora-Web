import { clearCsrfToken, getCsrfToken } from "./csrf-manager";
import { toBookoraApiError } from "@/api/http/errors";

// CsrfGuard rejects before Turnstile/token consumption or other business effects.
// A new tab may replace the shared cookie while this tab still caches its token.
export async function withAuthCsrfRecovery<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error: unknown) {
    const api = toBookoraApiError(error);
    if (api.statusCode !== 403 || api.code !== "CSRF_INVALID") throw error;
    clearCsrfToken();
    await getCsrfToken();
    return request();
  }
}
