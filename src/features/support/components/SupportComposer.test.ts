// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { reactive } from "vue";
import type { SupportMessageDto } from "@/api/generated/models";
const api = vi.hoisted(() => ({
  uploadAttachment: vi.fn(),
  discardAttachment: vi.fn(),
}));
vi.mock("../api/support-api", () => api);
const store = reactive({
  canReply: true,
  scope: { key: "scope", userId: "customer", branchId: null },
  activeId: null,
  draft: { type: "GENERAL", branchId: "branch" },
  messages: [] as SupportMessageDto[],
  send: vi.fn(() => true),
  inputTyping: vi.fn(),
  stopTyping: vi.fn(),
  registerCleanup: vi.fn(() => () => undefined),
  fail: vi.fn(),
});
vi.mock("../state/support.store", () => ({ useSupportStore: () => store }));
import SupportComposer from "./SupportComposer.vue";
import SupportEmojiPicker from "./SupportEmojiPicker.vue";
let wrapper: ReturnType<typeof mount>;
beforeEach(() => {
  vi.clearAllMocks();
  store.canReply = true;
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fixture-preview");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  api.discardAttachment.mockResolvedValue({});
  api.uploadAttachment.mockImplementation(async (_scope, payload) => ({
    id: payload.file.name,
    filename: payload.file.name,
    size: payload.file.size,
    mimeType: payload.file.type,
  }));
  wrapper = mount(SupportComposer);
});
afterEach(() => {
  wrapper.unmount();
  vi.restoreAllMocks();
});
async function choose(files: File[]) {
  const input = wrapper.find("input[type=file]");
  Object.defineProperty(input.element, "files", {
    configurable: true,
    value: files,
  });
  await input.trigger("change");
  await flushPromises();
}
describe("Support composer interactions", () => {
  it("replaces the selected text with emoji at the caret and restores focus without sending", async () => {
    const textarea = wrapper.get("textarea");
    await textarea.setValue("Trước thay sau");
    (textarea.element as HTMLTextAreaElement).setSelectionRange(6, 10);
    await wrapper
      .get('button[aria-label="Chọn biểu tượng cảm xúc"]')
      .trigger("click");
    await wrapper.vm.$nextTick();
    wrapper.getComponent(SupportEmojiPicker).vm.$emit("select", "📚");
    await wrapper.vm.$nextTick();
    expect((textarea.element as HTMLTextAreaElement).value).toBe(
      "Trước 📚 sau",
    );
    expect((textarea.element as HTMLTextAreaElement).selectionStart).toBe(8);
    expect(store.send).not.toHaveBeenCalled();
  });
  it("passes a persisted reply target and clears the quote only after optimistic acceptance", async () => {
    const original: SupportMessageDto = {
      id: "01M88WBHHKQPMRX8KMJ2GAQRDG",
      ticketId: "ticket",
      clientMessageId: "original",
      senderUserId: "customer",
      senderType: "CUSTOMER",
      senderName: "QA",
      text: "Original",
      sequence: 1,
      createdAt: "2026-11-25T00:00:00Z",
      attachments: [],
    };
    await wrapper.setProps({ replyTo: original });
    await wrapper.get("textarea").setValue("Reply");
    await wrapper.get("form").trigger("submit");
    expect(store.send).toHaveBeenCalledWith("Reply", [], original);
    expect(wrapper.emitted("cancelReply")).toHaveLength(1);
  });
  it("does not submit during Vietnamese IME composition or Shift+Enter", async () => {
    await wrapper.find("textarea").setValue("Tiếng Việt");
    await wrapper
      .find("textarea")
      .trigger("keydown", { key: "Enter", isComposing: true });
    await wrapper
      .find("textarea")
      .trigger("keydown", { key: "Enter", shiftKey: true });
    expect(store.send).not.toHaveBeenCalled();
    await wrapper.find("textarea").trigger("keydown", { key: "Enter" });
    expect(store.send).toHaveBeenCalledWith("Tiếng Việt", [], undefined);
  });
  it("allows a file-only send and keeps the original attachment descriptor", async () => {
    await choose([new File(["png"], "anh.png", { type: "image/png" })]);
    expect(wrapper.text()).toContain("Sẵn sàng gửi");
    await wrapper.find("form").trigger("submit");
    expect(store.send).toHaveBeenCalledWith(
      "",
      [expect.objectContaining({ id: "anh.png", filename: "anh.png" })],
      undefined,
    );
    expect(api.discardAttachment).not.toHaveBeenCalled();
  });
  it("enforces the five-file and 10 MiB bounds before upload", async () => {
    await choose(
      Array.from(
        { length: 6 },
        (_, i) => new File(["x"], `anh-${i}.png`, { type: "image/png" }),
      ),
    );
    expect(api.uploadAttachment).toHaveBeenCalledTimes(5);
    expect(wrapper.text()).toContain("tối đa 5 tệp");
    const big = new File(["x"], "huge.png", { type: "image/png" });
    Object.defineProperty(big, "size", { value: 10 * 1024 * 1024 + 1 });
    wrapper.unmount();
    wrapper = mount(SupportComposer);
    api.uploadAttachment.mockClear();
    await choose([big]);
    expect(api.uploadAttachment).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("10 MiB");
  });
  it("uses Unicode code points and accepts 4000 emoji while rejecting 4001", async () => {
    const textarea = wrapper.find("textarea");
    await textarea.setValue("😊".repeat(4000));
    expect(
      wrapper
        .find('button[aria-label="Gửi tin nhắn hỗ trợ"]')
        .attributes("disabled"),
    ).toBeUndefined();
    await textarea.setValue("😊".repeat(4001));
    expect(
      wrapper
        .find('button[aria-label="Gửi tin nhắn hỗ trợ"]')
        .attributes("disabled"),
    ).toBeDefined();
  });
  it("disables uploads and sending without effective reply authority", async () => {
    store.canReply = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.find("textarea").attributes("disabled")).toBeDefined();
    expect(
      wrapper.find('button[aria-label="Đính kèm tệp"]').attributes("disabled"),
    ).toBeDefined();
    await wrapper.find("form").trigger("submit");
    expect(store.send).not.toHaveBeenCalled();
  });
  it("discards abandoned staged files and revokes image previews on unmount", async () => {
    await choose([new File(["x"], "anh.png", { type: "image/png" })]);
    wrapper.unmount();
    expect(api.discardAttachment).toHaveBeenCalledWith("anh.png");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fixture-preview");
  });
});
