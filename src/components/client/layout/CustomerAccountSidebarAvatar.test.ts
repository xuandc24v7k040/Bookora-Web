// @vitest-environment happy-dom

import { defineComponent, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";
import { customerAccountKeys } from "@/features/customer-account/api/customer-account-query-keys";
import CustomerAccountSidebar from "./CustomerAccountSidebar.vue";

let activeQueryClient: QueryClient;

const AvatarDialogStub = defineComponent({
  name: "CustomerAvatarDialog",
  props: ["open", "avatarUrl", "fullName"],
  template: '<div data-testid="avatar-dialog" :data-open="String(open)" />',
});
const PreviewDialogStub = defineComponent({
  name: "ImagePreviewDialog",
  props: ["open", "src"],
  template: '<div data-testid="preview-dialog" :data-open="String(open)" />',
});

function mountSidebar(avatarUrl: string | null, attrs: Record<string, string> = {}) {
  activeQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  activeQueryClient.setQueryData(customerAccountKeys.profile(), {
    id: "customer-1",
    fullName: "Nguyễn An",
    email: "reader@bookora.vn",
    avatarUrl,
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/account/:pathMatch(.*)*", component: { template: "<div />" } }],
  });
  return mount(CustomerAccountSidebar, {
    attrs,
    global: {
      plugins: [
        createPinia(),
        router,
        [VueQueryPlugin, { queryClient: activeQueryClient }],
      ],
      stubs: {
        CustomerAvatarDialog: AvatarDialogStub,
        ImagePreviewDialog: PreviewDialogStub,
      },
    },
  });
}

describe("CustomerAccountSidebar avatar workflow", () => {
  it("forwards layout attributes only onto the aside despite sibling dialogs", () => {
    const wrapper = mountSidebar('https://cdn.example/avatar.webp', { class: 'sticky top-4 hidden self-start md:block', 'data-layout-sidebar': 'true' });
    expect(wrapper.get('aside').classes()).toEqual(expect.arrayContaining(['sticky', 'self-start', 'hidden', 'md:block']));
    expect(wrapper.get('aside').attributes('data-layout-sidebar')).toBe('true');
    expect(wrapper.get('[data-testid="avatar-dialog"]').classes()).not.toContain('self-start');
  });
  it("shows initials and opens management from an avatar without an image", async () => {
    const wrapper = mountSidebar(null);
    expect(wrapper.text()).toContain("NA");
    expect(wrapper.find('[data-slot="avatar-fallback"]').exists()).toBe(true);
    expect(wrapper.find('[data-slot="avatar-image"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="customer-avatar-preview"]').exists()).toBe(false);

    await wrapper.get('[data-testid="customer-avatar-trigger"]').trigger("click");
    expect(wrapper.get('[data-testid="avatar-dialog"]').attributes("data-open")).toBe("true");
  });

  it("shows Eye only with an image and opens preview without opening management", async () => {
    const wrapper = mountSidebar("https://cdn.example/avatar.webp");
    expect(wrapper.find('[data-testid="customer-avatar-preview"]').exists()).toBe(true);

    await wrapper.get('[data-testid="customer-avatar-preview"]').trigger("click");
    expect(wrapper.get('[data-testid="preview-dialog"]').attributes("data-open")).toBe("true");
    expect(wrapper.get('[data-testid="avatar-dialog"]').attributes("data-open")).toBe("false");
  });

  it("shows initials immediately when the authoritative profile clears avatarUrl", async () => {
    const wrapper = mountSidebar("https://cdn.example/avatar.webp");

    activeQueryClient.setQueryData(customerAccountKeys.profile(), {
      id: "customer-1",
      fullName: "Nguyễn An",
      email: "reader@bookora.vn",
      avatarUrl: null,
    });
    await nextTick();

    expect(wrapper.text()).toContain("NA");
    expect(
      wrapper.find('[data-testid="customer-avatar-preview"]').exists(),
    ).toBe(false);
  });
});
