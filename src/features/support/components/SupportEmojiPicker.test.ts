// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import type { NativeEmoji } from "emoji-picker-element/shared";
const database = vi.hoisted(() => ({
  ready: vi.fn(),
  getEmojiByGroup: vi.fn(),
  getEmojiBySearchQuery: vi.fn(),
  getTopFavoriteEmoji: vi.fn(),
  getPreferredSkinTone: vi.fn(),
  setPreferredSkinTone: vi.fn(),
  incrementFavoriteEmojiCount: vi.fn(),
}));
vi.mock("emoji-picker-element/database", () => ({
  default: class {
    ready = database.ready;
    getEmojiByGroup = database.getEmojiByGroup;
    getEmojiBySearchQuery = database.getEmojiBySearchQuery;
    getTopFavoriteEmoji = database.getTopFavoriteEmoji;
    getPreferredSkinTone = database.getPreferredSkinTone;
    setPreferredSkinTone = database.setPreferredSkinTone;
    incrementFavoriteEmojiCount = database.incrementFavoriteEmojiCount;
  },
}));
import SupportEmojiPicker from "./SupportEmojiPicker.vue";
const emoji = (
  unicode: string,
  annotation: string,
  group = 0,
): NativeEmoji => ({
  unicode,
  annotation,
  group,
  name: annotation,
  order: 1,
  tags: [],
  version: 1,
});
let wrapper: ReturnType<typeof mount>;
beforeEach(async () => {
  vi.clearAllMocks();
  database.ready.mockResolvedValue(undefined);
  database.getEmojiByGroup.mockResolvedValue([
    emoji("😀", "Mặt cười"),
    emoji("😃", "Cười tươi"),
  ]);
  database.getEmojiBySearchQuery.mockResolvedValue([emoji("📚", "Sách", 7)]);
  database.getTopFavoriteEmoji.mockResolvedValue([]);
  database.getPreferredSkinTone.mockResolvedValue(0);
  database.setPreferredSkinTone.mockResolvedValue(undefined);
  database.incrementFavoriteEmojiCount.mockResolvedValue(undefined);
  wrapper = mount(SupportEmojiPicker);
  await flushPromises();
});
afterEach(() => wrapper.unmount());
describe("Support emoji ScrollArea picker", () => {
  it("uses the shared ScrollArea and preserves category/search/selection without a custom-element scrollbar", async () => {
    expect(
      wrapper
        .find('.support-emoji-scroll [data-slot="scroll-area-viewport"]')
        .exists(),
    ).toBe(true);
    expect(wrapper.find("emoji-picker").exists()).toBe(false);
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(9);
    await wrapper.get('button[aria-label="Người"]').trigger("click");
    await flushPromises();
    expect(database.getEmojiByGroup).toHaveBeenLastCalledWith(1);
    expect(
      wrapper.get('button[aria-label="Người"]').attributes("aria-selected"),
    ).toBe("true");
    await wrapper.get('input[aria-label="Tìm biểu tượng"]').setValue("sách");
    await flushPromises();
    expect(database.getEmojiBySearchQuery).toHaveBeenCalledWith("sách");
    await wrapper.get('button[aria-label="Sách"]').trigger("click");
    expect(wrapper.emitted("select")).toEqual([["📚"]]);
    expect(database.incrementFavoriteEmojiCount).toHaveBeenCalledWith("📚");
  });
  it("moves keyboard focus within the grid and switches categories with arrows", async () => {
    await wrapper
      .get('button[aria-label="Mặt cười"]')
      .trigger("keydown", { key: "ArrowRight" });
    expect(
      wrapper.get('button[aria-label="Cười tươi"]').attributes("tabindex"),
    ).toBe("0");
    await wrapper
      .get('button[aria-label="Cảm xúc"]')
      .trigger("keydown", { key: "ArrowRight" });
    await flushPromises();
    expect(database.getEmojiByGroup).toHaveBeenLastCalledWith(1);
  });
});
