// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, reactive, ref } from "vue";
import { Check, Copy } from "@lucide/vue";
import type { ChatMessage } from "../state/support-messages";
const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));
vi.mock("vue-sonner", () => ({ toast }));
const downloadAttachment = vi.fn().mockResolvedValue(undefined);

const store = reactive({
  activeId: "ticket",
  threadKey: "ticket",
  canReply: true,
  error: "",
  active: {
    id: "ticket",
    type: "GENERAL",
    status: "IN_PROGRESS",
    subject: "Chọn sách",
    customerName: "Customer",
    branchName: "Branch",
    assigneeId: "staff",
    customerReadSequence: 0,
    assigneeReadSequence: 0,
  },
  threads: { ticket: { before: null, loading: false, error: "" } },
  messages: [] as ChatMessage[],
  typing: {} as Record<string, number>,
  markRead: vi.fn(),
  stopTyping: vi.fn(),
  loadHistory: vi.fn(),
  retry: vi.fn(),
  registerCleanup: vi.fn(() => () => undefined),
});
vi.mock("../state/support.store", () => ({ useSupportStore: () => store }));
vi.mock("@/stores/auth.store", () => ({
  useAuthStore: () => ({ user: { id: "me" } }),
}));
vi.mock("../api/support-queries", () => ({
  useSupportOrderContext: () => ({ data: ref(undefined) }),
}));
import SupportThread from "./SupportThread.vue";

function message(id: string, sequence: number): ChatMessage {
  return {
    id,
    ticketId: "ticket",
    clientMessageId: id,
    senderUserId: "me",
    senderType: "CUSTOMER",
    senderName: "Customer",
    text: id,
    sequence,
    createdAt: "2026-11-24T01:00:00Z",
    attachments: [],
  };
}
let wrapper: ReturnType<typeof mount>;
beforeEach(() => {
  vi.clearAllMocks();
  store.canReply = true;
  store.active.assigneeReadSequence = 0;
  store.messages = [message("first", 1)];
  class Observer {
    observe() {}
    disconnect() {}
  }
  vi.stubGlobal("IntersectionObserver", Observer);
  vi.stubGlobal("ResizeObserver", Observer);
  wrapper = mount(SupportThread, {
    props: { customer: true },
    global: {
      stubs: {
        ScrollArea: {
          template:
            '<div data-slot="scroll-area-viewport"><div><slot /></div></div>',
        },
        SupportComposer: true,
        SupportAttachment: defineComponent({
          props: ["attachment", "pending"],
          setup(_props, { expose }) {
            expose({ download: downloadAttachment });
            return () => h("span");
          },
        }),
        SupportManageActions: true,
      },
    },
  });
});
afterEach(() => {
  wrapper.unmount();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Support message rendering", () => {
  it("copies exact plain text silently from an icon-only toolbar beside the bubble", async () => {
    vi.useFakeTimers();
    const write = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    store.messages = [{ ...message("copy", 1), text: "<b>123</b> 😊" }];
    await nextTick();
    const actions = wrapper.get(".support-message-actions");
    expect(
      actions.element.previousElementSibling?.classList.contains(
        "support-bubble",
      ),
    ).toBe(true);
    expect(actions.text()).toBe("");
    expect(actions.classes()).not.toContain("h-9");
    expect(actions.findComponent(Copy).exists()).toBe(true);
    await actions
      .get('button[aria-label="Sao chép tin nhắn"]')
      .trigger("click");
    expect(write).toHaveBeenCalledWith("<b>123</b> 😊");
    expect(actions.findComponent(Check).exists()).toBe(true);
    expect(actions.findComponent(Copy).exists()).toBe(false);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1500);
    expect(actions.findComponent(Copy).exists()).toBe(true);
    expect(actions.findComponent(Check).exists()).toBe(false);
  });
  it("does not show a copied check when clipboard permission is denied", async () => {
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("Denied"),
    );
    await wrapper
      .get('button[aria-label="Sao chép tin nhắn"]')
      .trigger("click");
    await flushPromises();
    expect(wrapper.findComponent(Check).exists()).toBe(false);
    expect(wrapper.get('[role="status"]').text()).toContain(
      "Không thể sao chép",
    );
    expect(toast.error).not.toHaveBeenCalled();
  });
  it("offers image download in the same toolbar and delegates to the authorized attachment view", async () => {
    store.messages = [
      {
        ...message("image", 1),
        attachments: [
          {
            id: "image-1",
            filename: "photo.png",
            mimeType: "image/png",
            size: 100,
          },
        ],
      },
    ];
    await nextTick();
    await wrapper
      .get(
        '.support-message-actions button[aria-label="Tải ảnh trong tin nhắn"]',
      )
      .trigger("click");
    await flushPromises();
    expect(downloadAttachment).toHaveBeenCalledTimes(1);
    store.messages = [
      {
        ...message("pending", 2),
        delivery: "sending",
        attachments: [
          {
            id: "image-2",
            filename: "photo.png",
            mimeType: "image/png",
            size: 100,
          },
        ],
      },
    ];
    await nextTick();
    expect(
      wrapper.find('button[aria-label="Tải ảnh trong tin nhắn"]').exists(),
    ).toBe(false);
  });
  it("renders the server quote separately from text and removes reply actions without permission", async () => {
    store.messages = [
      {
        ...message("reply", 2),
        text: "Canonical reply body",
        replyToMessageId: "original",
        replyTo: {
          id: "original",
          senderName: "Original sender",
          text: "Original body",
          attachmentCount: 0,
        },
      },
    ];
    await nextTick();
    expect(
      wrapper.get('button[aria-label="Xem tin nhắn gốc"]').text(),
    ).toContain("Original body");
    expect(wrapper.get("[data-message-text]").text()).toBe(
      "Canonical reply body",
    );
    await wrapper.get('button[aria-label="Trả lời tin nhắn"]').trigger("click");
    expect(
      wrapper.getComponent({ name: "SupportComposer" }).props("replyTo"),
    ).toMatchObject({ id: "reply" });
    store.canReply = false;
    await nextTick();
    expect(wrapper.find('button[aria-label="Trả lời tin nhắn"]').exists()).toBe(
      false,
    );
    expect(wrapper.findComponent({ name: "SupportComposer" }).exists()).toBe(
      false,
    );
  });
  it("updates existing read receipts after appending messages and loading earlier history", async () => {
    store.messages.push(message("second", 2));
    await nextTick();
    expect(wrapper.findAll("[data-message-id]")).toHaveLength(2);
    store.active.assigneeReadSequence = 1;
    await nextTick();
    expect(wrapper.get('[data-message-id="first"]').text()).toContain("Đã xem");
    expect(wrapper.get('[data-message-id="second"]').text()).toContain(
      "Đã gửi",
    );
    store.messages.unshift({
      ...message("older", 0),
      createdAt: "2026-11-23T01:00:00Z",
    });
    await nextTick();
    expect(wrapper.text()).toContain("23 thg 11, 2026");
    expect(wrapper.text()).toContain("24 thg 11, 2026");
    expect(wrapper.get('[data-message-id="first"]').text()).toContain("Đã xem");
  });

  it("renders failure, retry authority and canonical replacement without stale content", async () => {
    store.messages.push({ ...message("pending", 2), delivery: "sending" });
    await nextTick();
    store.messages[1]!.delivery = "failed";
    store.messages[1]!.error = "Mất kết nối";
    await nextTick();
    expect(wrapper.get('[data-message-id="pending"]').text()).toContain(
      "Mất kết nối",
    );
    expect(
      wrapper
        .findAll("button")
        .some((button) => button.text().includes("Gửi lại")),
    ).toBe(true);
    store.canReply = false;
    await nextTick();
    expect(
      wrapper
        .findAll("button")
        .find((button) => button.text().includes("Gửi lại"))
        ?.attributes("disabled"),
    ).toBeDefined();
    store.messages[1] = {
      ...message("canonical", 2),
      text: "Đã gửi thành công",
    };
    await nextTick();
    expect(wrapper.find('[data-message-id="pending"]').exists()).toBe(false);
    expect(wrapper.get('[data-message-id="canonical"]').text()).toContain(
      "Đã gửi thành công",
    );
    expect(wrapper.text()).not.toContain("Mất kết nối");
  });
});
