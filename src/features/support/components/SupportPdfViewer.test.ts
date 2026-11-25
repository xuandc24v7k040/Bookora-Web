// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import SupportPdfViewer from "./SupportPdfViewer.vue";

const engine = vi.hoisted(() => ({
  getDocument: vi.fn(),
  workerOptions: { workerSrc: "" },
}));
vi.mock("pdfjs-dist", () => ({
  getDocument: engine.getDocument,
  GlobalWorkerOptions: engine.workerOptions,
  version: "6.5.438",
}));
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({
  default: "/pdf-worker.mjs",
}));
const destroy = vi.fn().mockResolvedValue(undefined);
const cancel = vi.fn();
const render = vi.fn();
const getPage = vi.fn();
let wrapper: ReturnType<typeof mount>;
function createViewer() {
  wrapper = mount(SupportPdfViewer, {
    props: { file: new Blob(["%PDF-1.7"]) },
    global: {
      stubs: {
        ScrollArea: { template: "<div><slot /></div>" },
        ScrollBar: true,
      },
    },
  });
  return wrapper;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(640);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    {} as CanvasRenderingContext2D,
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  render.mockReturnValue({ promise: Promise.resolve(), cancel });
  getPage.mockImplementation(async () => ({
    getViewport: ({ scale }: { scale: number }) => ({
      width: 600 * scale,
      height: 800 * scale,
    }),
    render,
  }));
  engine.getDocument.mockReturnValue({
    promise: Promise.resolve({ numPages: 3, getPage }),
    destroy,
  });
});
afterEach(() => {
  wrapper?.unmount();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("Support PDF canvas lifecycle", () => {
  it("renders bytes using the local worker, navigates pages, zooms and releases resources", async () => {
    createViewer();
    await flushPromises();
    expect(engine.getDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Uint8Array),
        enableXfa: false,
        cMapUrl: expect.stringContaining("/pdfjs/6.5.438/cmaps/"),
      }),
    );
    expect(engine.workerOptions.workerSrc).toBe("/pdf-worker.mjs");
    expect(wrapper.text()).toContain("Trang 1 / 3");
    await wrapper.get('button[aria-label="Trang PDF sau"]').trigger("click");
    await flushPromises();
    expect(getPage).toHaveBeenLastCalledWith(2);
    expect(wrapper.text()).toContain("Trang 2 / 3");
    await wrapper.get('button[aria-label="Phóng to PDF"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('button[aria-label="PDF vừa chiều rộng"]').text()).toBe(
      "125%",
    );
    expect(cancel).toHaveBeenCalled();
    const target = wrapper.get("canvas").element as HTMLCanvasElement;
    wrapper.unmount();
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(target.width).toBe(0);
  });
  it("shows an actionable error for invalid/password-protected files and can retry", async () => {
    engine.getDocument.mockReturnValueOnce({
      promise: Promise.reject(new Error("Invalid PDF")),
      destroy,
    });
    createViewer();
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain("Không mở được PDF");
    await wrapper.get('[role="alert"] button').trigger("click");
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("Trang 1 / 3");
  });
});
