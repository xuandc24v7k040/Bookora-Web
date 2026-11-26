// @vitest-environment happy-dom
import { defineComponent, nextTick, ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGhnShippingQuote } from "./use-ghn-shipping-quote";
const api = vi.hoisted(() => ({ quote: vi.fn() }));
vi.mock("@/features/checkout/api/checkout-api", () => ({
  getGhnShippingQuote: api.quote,
}));

describe("independent GHN loading and stale context", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });
  it("discards late A when B resolves first and isolates failure from checkout", async () => {
    let resolveA!: (value: unknown) => void;
    api.quote
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveA = resolve;
          }),
      )
      .mockResolvedValueOnce({
        enabled: true,
        quote: {
          provider: "GHN",
          shippingFee: 21000,
          estimatedDeliveryAt: "2026-11-28T00:00:00Z",
          expiresAt: new Date(Date.now() + 60000).toISOString(),
          quoteReference: "B",
        },
      });
    const key = ref("A");
    let state!: ReturnType<typeof useGhnShippingQuote>;
    const wrapper = mount(
      defineComponent({
        setup() {
          state = useGhnShippingQuote({
            enabled: () => true,
            ready: () => true,
            contextKey: () => key.value,
            payload: () => ({ selectedCartItemIds: ["qa"] }),
          });
          return () => null;
        },
      }),
    );
    expect(state.loading.value).toBe(true);
    key.value = "B";
    await nextTick();
    await flushPromises();
    expect(state.quote.value?.quoteReference).toBe("B");
    resolveA({ enabled: true, quote: { quoteReference: "A" } });
    await flushPromises();
    expect(state.quote.value?.quoteReference).toBe("B");
    api.quote.mockRejectedValueOnce(new Error("controlled failure"));
    await state.refresh();
    expect(state.quote.value).toBeNull();
    expect(state.error.value).toContain("Chưa thể");
    wrapper.unmount();
  });
  it("does not fetch when disabled and expires without polling", async () => {
    vi.useFakeTimers();
    const enabled = ref(false);
    api.quote.mockResolvedValue({
      enabled: true,
      quote: {
        provider: "GHN",
        shippingFee: 21000,
        estimatedDeliveryAt: "2026-11-28T00:00:00Z",
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        quoteReference: "qa",
      },
    });
    let state!: ReturnType<typeof useGhnShippingQuote>;
    const wrapper = mount(
      defineComponent({
        setup() {
          state = useGhnShippingQuote({
            enabled: () => enabled.value,
            ready: () => true,
            contextKey: () => "qa",
            payload: () => ({ selectedCartItemIds: ["qa"] }),
          });
          return () => null;
        },
      }),
    );
    expect(api.quote).not.toHaveBeenCalled();
    enabled.value = true;
    await nextTick();
    await flushPromises();
    expect(state.quote.value).not.toBeNull();
    vi.advanceTimersByTime(1100);
    expect(state.quote.value).toBeNull();
    expect(api.quote).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});
