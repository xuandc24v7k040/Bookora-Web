// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SupportAvatar from "./SupportAvatar.vue";

describe("Support profile avatar", () => {
  it("renders the actual profile URL, falls back on failure and retries a changed URL", async () => {
    const wrapper = mount(SupportAvatar, {
      props: { name: "Nguyễn Minh An", url: "/avatar.webp" },
    });
    expect(wrapper.get("img").attributes("src")).toBe("/avatar.webp");
    await wrapper.get("img").trigger("error");
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.text()).toBe("MA");
    await wrapper.setProps({ url: "/avatar-new.webp" });
    expect(wrapper.get("img").attributes("src")).toBe("/avatar-new.webp");
    wrapper.unmount();
  });
  it("uses initials without inventing a profile image for a missing avatar", () => {
    const wrapper = mount(SupportAvatar, { props: { name: "Khách Hàng" } });
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.text()).toBe("KH");
    wrapper.unmount();
  });
});
