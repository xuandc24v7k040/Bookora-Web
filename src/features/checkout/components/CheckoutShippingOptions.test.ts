// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import CheckoutShippingOptions from "./CheckoutShippingOptions.vue";
import type { ShippingQuoteResponseDto } from "@/api/generated/models";

const internalQuote = {
  shippingFee: 32000,
  chargeableWeightGram: 500,
} as ShippingQuoteResponseDto;
const quote = {
  provider: "GHN" as const,
  shippingFee: 31501,
  estimatedDeliveryAt: "2026-11-27T17:00:00Z",
  quoteReference: "qa",
  expiresAt: "2026-11-28T00:00:00Z",
};
const props = {
  modelValue: "INTERNAL" as const,
  internalQuote,
  internalRoute: "Cùng miền",
  ghnEnabled: true,
  ghnQuote: quote,
  ghnLoading: false,
  ghnError: null,
  hasAddress: true,
};

describe("Checkout carrier radio cards", () => {
  it("keeps the original local GHN logo beside its title without the truck icon", () => {
    const wrapper = mount(CheckoutShippingOptions, { props });
    const label = wrapper.get('label[for="shipping-ghn"]');
    const logo = label.get('img[src="/ghn-logo.png"]');
    expect(logo.attributes("alt")).toBe("");
    expect(logo.element.parentElement?.textContent).toContain(
      "Giao Hàng Nhanh",
    );
    expect(label.find(".lucide-truck").exists()).toBe(false);
    expect(label.find(".lucide-calendar-clock").exists()).toBe(true);
    expect(
      wrapper.get('label[for="shipping-internal"]').find("img").exists(),
    ).toBe(false);
    wrapper.unmount();
  });
  it("selects INTERNAL by default, exposes GHN by keyboard, and shows canonical fee/date", async () => {
    const wrapper = mount(CheckoutShippingOptions, {
      props,
      attachTo: document.body,
    });
    expect(wrapper.get("#shipping-internal").attributes("aria-checked")).toBe(
      "true",
    );
    expect(wrapper.get("#shipping-ghn").attributes("aria-checked")).toBe(
      "false",
    );
    expect(wrapper.text()).toContain("28/11/2026");
    expect(wrapper.text()).toContain("31.501");
    await wrapper.get("#shipping-ghn").trigger("click");
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["GHN"]);
    wrapper.unmount();
  });
  it("does not disable INTERNAL while GHN loads and hides GHN under disabled flag", async () => {
    const wrapper = mount(CheckoutShippingOptions, {
      props: { ...props, ghnQuote: null, ghnLoading: true },
    });
    expect(
      wrapper.get("#shipping-internal").attributes("disabled"),
    ).toBeUndefined();
    expect(wrapper.get("#shipping-ghn").attributes("disabled")).toBeDefined();
    await wrapper.setProps({ ghnEnabled: false });
    expect(wrapper.find("#shipping-ghn").exists()).toBe(false);
  });
  it("retry does not select a provider or drop selected GHN intent", async () => {
    const wrapper = mount(CheckoutShippingOptions, {
      props: {
        ...props,
        modelValue: "GHN",
        ghnQuote: null,
        ghnError: "GHN unavailable",
      },
    });
    // Radio primitives are buttons; target the actual retry by text.
    const retry = wrapper
      .findAll("button")
      .find((button) => button.text().includes("Thử lại GHN"))!;
    await retry.trigger("click");
    expect(wrapper.emitted("retry")).toHaveLength(1);
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
});
