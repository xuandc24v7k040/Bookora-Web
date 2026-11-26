import { onBeforeUnmount, ref, watch } from "vue";
import type {
  GhnShippingQuoteDto,
  PreviewCheckoutDto,
} from "@/api/generated/models";
import { getGhnShippingQuote } from "@/features/checkout/api/checkout-api";

interface GhnShippingOptions {
  enabled: () => boolean;
  ready: () => boolean;
  contextKey: () => string;
  payload: () => PreviewCheckoutDto;
}

/** Unselected carrier requests never participate in checkout's busy/submit state. */
export function useGhnShippingQuote(options: GhnShippingOptions) {
  const quote = ref<GhnShippingQuoteDto | null>(null);
  const error = ref<string | null>(null);
  const loading = ref(false);
  const quotedContextKey = ref("");
  let controller: AbortController | undefined;
  let sequence = 0;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;

  function invalidate(message: string | null = null): void {
    quote.value = null;
    quotedContextKey.value = "";
    error.value = message;
    if (expiryTimer) clearTimeout(expiryTimer);
  }

  function accept(nextQuote: GhnShippingQuoteDto, key: string): void {
    if (key !== options.contextKey()) return;
    const remaining = Date.parse(nextQuote.expiresAt) - Date.now();
    invalidate();
    if (!Number.isFinite(remaining) || remaining <= 0) {
      error.value = "Báo giá GHN đã hết hạn. Vui lòng thử lại.";
      return;
    }
    quote.value = nextQuote;
    quotedContextKey.value = key;
    expiryTimer = setTimeout(
      () => invalidate("Báo giá GHN đã hết hạn. Vui lòng thử lại."),
      Math.min(remaining, 2147483647),
    );
  }

  async function refresh(): Promise<void> {
    controller?.abort();
    controller = new AbortController();
    const requestController = controller;
    const current = ++sequence;
    const key = options.contextKey();
    invalidate();
    loading.value = false;
    if (!options.enabled() || !options.ready()) return;
    loading.value = true;
    try {
      const { shippingQuoteReference: _reference, ...payload } =
        options.payload();
      const result = await getGhnShippingQuote(
        payload,
        requestController.signal,
      );
      if (
        current !== sequence ||
        requestController.signal.aborted ||
        key !== options.contextKey()
      )
        return;
      if (!result.quote) {
        error.value =
          result.message ?? "GHN hiện chưa có báo giá cho đơn hàng này.";
        return;
      }
      accept(result.quote, key);
    } catch {
      if (
        current === sequence &&
        !requestController.signal.aborted &&
        key === options.contextKey()
      ) {
        error.value =
          "Chưa thể lấy báo giá GHN. Vui lòng thử lại hoặc chọn giao hàng tiêu chuẩn.";
      }
    } finally {
      if (current === sequence) loading.value = false;
    }
  }

  function reject(message: string): void {
    controller?.abort();
    ++sequence;
    loading.value = false;
    invalidate(message);
  }

  watch(
    [options.enabled, options.ready, options.contextKey],
    () => {
      void refresh();
    },
    { immediate: true, flush: "sync" },
  );
  onBeforeUnmount(() => {
    controller?.abort();
    ++sequence;
    if (expiryTimer) clearTimeout(expiryTimer);
  });
  return { quote, error, loading, quotedContextKey, refresh, reject, accept };
}
