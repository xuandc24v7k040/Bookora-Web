// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { reactive } from "vue";
import SupportAttachment from "./SupportAttachment.vue";

const api = vi.hoisted(() => ({ content: vi.fn() }));
vi.mock("../api/support-api", () => ({ attachmentContent: api.content }));
const store = reactive({
  scope: { key: "owner-1", userId: "owner", branchId: null },
  isCustomer: true,
  mediaEpoch: 0,
  registerCleanup: vi.fn(() => vi.fn()),
  fail: vi.fn(),
});
vi.mock("../state/support.store", () => ({ useSupportStore: () => store }));
vi.mock("./SupportPdfViewer.vue", () => ({
  __esModule: true,
  default: {
    props: ["file"],
    template: "<div data-pdf-viewer>PDF canvas</div>",
  },
}));
let wrapper: ReturnType<typeof mount>;
const blob = new Blob(["%PDF-1.7"], { type: "application/pdf" });
beforeEach(() => {
  vi.clearAllMocks();
  store.mediaEpoch = 0;
  store.scope.key = "owner-1";
  api.content.mockResolvedValue(blob);
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:private-pdf");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    () => undefined,
  );
  wrapper = mount(SupportAttachment, {
    props: {
      attachment: {
        id: "pdf-1",
        filename: "private.pdf",
        mimeType: "application/pdf",
        size: 100,
      },
    },
    global: {
      stubs: {
        Dialog: {
          props: ["open"],
          template: '<div><slot v-if="open" /></div>',
        },
        DialogContent: { template: '<div role="dialog"><slot /></div>' },
        DialogHeader: { template: "<div><slot /></div>" },
        DialogTitle: { template: "<h2><slot /></h2>" },
        DialogDescription: { template: "<p><slot /></p>" },
      },
    },
  });
});
afterEach(() => {
  wrapper.unmount();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
describe("Support private PDF authorization", () => {
  it.each([
    [
      "document.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    ["archive.zip", "application/zip"],
  ])(
    "preserves the ordinary download action for %s",
    async (filename, mimeType) => {
      await wrapper.setProps({
        attachment: { id: "document-1", filename, mimeType, size: 100 },
      });
      await wrapper
        .get(`button[aria-label="Tải xuống ${filename}"]`)
        .trigger("click");
      await flushPromises();
      expect(api.content).toHaveBeenCalledTimes(1);
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
      expect(wrapper.find("[data-pdf-viewer]").exists()).toBe(false);
    },
  );
  it("opens a canvas viewer without an iframe and clears it on scope/media invalidation", async () => {
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Xem")!
      .trigger("click");
    await flushPromises();
    expect(wrapper.find("[data-pdf-viewer]").exists()).toBe(true);
    expect(wrapper.find("iframe").exists()).toBe(false);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    store.mediaEpoch++;
    await flushPromises();
    expect(wrapper.find("[data-pdf-viewer]").exists()).toBe(false);
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Xem")!
      .trigger("click");
    await flushPromises();
    expect(api.content).toHaveBeenCalledTimes(2);
  });
  it("reauthorizes download instead of reusing a previously opened PDF after a denial", async () => {
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Xem")!
      .trigger("click");
    await flushPromises();
    api.content.mockRejectedValueOnce(new Error("Denied"));
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Tải xuống")!
      .trigger("click");
    await flushPromises();
    expect(api.content).toHaveBeenCalledTimes(2);
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it("downloads fresh authorized PDF bytes and revokes the temporary URL", async () => {
    vi.useFakeTimers();
    await wrapper
      .get('button[aria-label="Tải xuống private.pdf"]')
      .trigger("click");
    await vi.advanceTimersByTimeAsync(0);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    await vi.advanceTimersByTimeAsync(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:private-pdf");
  });
});
