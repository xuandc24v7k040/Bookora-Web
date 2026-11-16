// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomerReviewDto } from "@/api/generated/models";
import { useReviewMediaForm } from "./use-review-media-form";

const api = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  list: vi.fn(),
}));
vi.mock("../api/engagement-api", () => ({
  uploadReviewImages: api.upload,
  deleteReviewImage: api.remove,
  listMyReviews: api.list,
}));
const review: CustomerReviewDto = {
  id: "review-a",
  orderId: "order",
  orderItemId: "item",
  orderCode: "BK",
  variantLabel: null,
  product: { id: "product", name: "Sách", slug: "sach" },
  rating: 5,
  content: null,
  isVisible: true,
  createdAt: "",
  updatedAt: "",
  media: [{ id: "old", url: "https://cdn/old", sortOrder: 0 }],
};

function harness() {
  let form!: ReturnType<typeof useReviewMediaForm>;
  const wrapper = mount(
    defineComponent({
      setup() {
        form = useReviewMediaForm();
        return () => null;
      },
    }),
  );
  return { form, wrapper };
}

describe("Ảnh modal đánh giá", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:local"),
      revokeObjectURL: vi.fn(),
    });
    api.list.mockResolvedValue({
      items: [{ ...review, media: [] }],
      totalPages: 1,
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("hủy không xóa ảnh đã lưu; đổi review dọn ảnh local và object URL", () => {
    const { form, wrapper } = harness();
    form.reset(review);
    form.removeStored("old");
    form.add([new File(["x"], "new.png")]);
    expect(api.remove).not.toHaveBeenCalled();
    form.reset({ ...review, id: "review-b", media: [] });
    expect(form.count.value).toBe(0);
    expect(form.removed.value).toEqual([]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local");
    wrapper.unmount();
  });

  it("xóa local không gọi API và không cho quá bốn ảnh", () => {
    const { form, wrapper } = harness();
    form.reset(review);
    form.add(Array.from({ length: 4 }, () => new File(["x"], "new.png")));
    expect(form.count.value).toBe(1);
    form.add([new File(["x"], "new.png")]);
    form.removeLocal(form.local.value[0]!.id);
    expect(form.count.value).toBe(1);
    expect(api.remove).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("giữ reviewId sau upload fail để retry không tạo review thứ hai", async () => {
    const { form, wrapper } = harness();
    form.add([new File(["x"], "new.png")]);
    api.upload
      .mockRejectedValueOnce(new Error("storage"))
      .mockResolvedValueOnce([
        { id: "new", url: "https://cdn/new", sortOrder: 0 },
      ]);
    await expect(form.saveMedia(review)).rejects.toThrow("storage");
    expect(form.savedReview.value?.id).toBe(review.id);
    expect(form.partial.value).toBe(true);
    expect(form.local.value).toHaveLength(1);
    await form.saveMedia(review);
    expect(api.upload.mock.calls.map((call) => call[0])).toEqual([
      review.id,
      review.id,
    ]);
    expect(form.partial.value).toBe(false);
    expect(form.local.value).toHaveLength(0);
    wrapper.unmount();
  });

  it("lưu không có ảnh hợp lệ và chỉ xóa ảnh server khi lưu", async () => {
    const { form, wrapper } = harness();
    form.reset(review);
    form.removeStored("old");
    await form.saveMedia(review);
    expect(api.remove).toHaveBeenCalledWith(review.id, "old");
    expect(api.upload).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("đồng bộ ảnh đã commit khi mất response và không tải lại cùng ảnh", async () => {
    const { form, wrapper } = harness();
    form.reset({ ...review, media: [] });
    form.add([new File(["x"], "new.png")]);
    api.upload.mockRejectedValueOnce(new Error("response lost"));
    api.list.mockResolvedValue({
      items: [
        {
          ...review,
          media: [
            { id: "committed", url: "https://cdn/committed", sortOrder: 0 },
          ],
        },
      ],
      totalPages: 1,
    });
    await expect(form.saveMedia(review)).rejects.toThrow("response lost");
    expect(form.stored.value[0]?.id).toBe("committed");
    expect(form.local.value).toHaveLength(0);
    await form.saveMedia(review);
    expect(api.upload).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});
