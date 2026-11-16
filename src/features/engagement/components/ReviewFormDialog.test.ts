// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CustomerReviewDto,
  PendingReviewOpportunityDto,
} from "@/api/generated/models";
import ImageDropzone from "@/components/shared/ImageDropzone.vue";
import ReviewFormDialog from "./ReviewFormDialog.vue";

const api = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  list: vi.fn(),
}));
vi.mock("../api/engagement-api", () => ({
  createReview: api.create,
  updateReview: api.update,
  uploadReviewImages: api.upload,
  deleteReviewImage: api.remove,
  listMyReviews: api.list,
  engagementKeys: {
    reviews: ["engagement", "reviews"],
    dashboard: ["engagement", "dashboard"],
  },
}));
vi.mock("../state/engagement-sync", () => ({
  publishEngagementChange: vi.fn(),
}));
vi.mock("vue-sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const opportunity: PendingReviewOpportunityDto = {
  orderId: "order",
  orderItemId: "line-a",
  orderCode: "BK",
  product: { id: "product", name: "Sách", slug: "sach" },
  variantLabel: "Màu mực: Xanh · Quy cách: Hộp 10",
  completedAt: "",
};
const result: CustomerReviewDto = {
  id: "review",
  orderId: "order",
  orderItemId: "line-a",
  orderCode: "BK",
  product: opportunity.product,
  variantLabel: opportunity.variantLabel,
  media: [],
  rating: 5,
  content: null,
  isVisible: true,
  createdAt: "",
  updatedAt: "",
};
let wrapper: VueWrapper;
let client: QueryClient;

async function open(item = opportunity) {
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  wrapper = mount(ReviewFormDialog, {
    props: { open: true, opportunity: item },
    attachTo: document.body,
    global: { plugins: [[VueQueryPlugin, { queryClient: client }]] },
  });
  await flushPromises();
}

async function submit() {
  document
    .querySelector("form")!
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  await flushPromises();
}

describe("Modal review mua theo dòng hàng", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:preview"),
      revokeObjectURL: vi.fn(),
    });
    api.create.mockResolvedValue(result);
    api.update.mockResolvedValue(result);
    api.list.mockResolvedValue({ items: [result], totalPages: 1 });
  });
  afterEach(() => {
    wrapper?.unmount();
    client?.clear();
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("gửi nội dung trống và 0 ảnh, giữ đầy đủ snapshot và đúng orderItemId", async () => {
    await open();
    expect(document.body.textContent).toContain("0/4");
    expect(document.body.textContent).toContain(opportunity.variantLabel);
    await submit();
    expect(api.create).toHaveBeenCalledWith({
      orderId: "order",
      orderItemId: "line-a",
      productId: "product",
      rating: 5,
      content: null,
    });
    expect(api.upload).not.toHaveBeenCalled();
    expect(wrapper.emitted("saved")).toHaveLength(1);
  });

  it("SIMPLE không hiện badge mặc định và khóa double submit", async () => {
    await open({ ...opportunity, orderItemId: "line-b", variantLabel: null });
    expect(document.body.textContent).not.toContain("Phân loại:");
    let resolve!: (value: CustomerReviewDto) => void;
    api.create.mockReturnValue(
      new Promise<CustomerReviewDto>((done) => {
        resolve = done;
      }),
    );
    await submit();
    await submit();
    expect(api.create).toHaveBeenCalledTimes(1);
    resolve({ ...result, orderItemId: "line-b", variantLabel: null });
    await flushPromises();
  });

  it("giữ modal/preview khi upload lỗi và retry bằng reviewId đã tạo", async () => {
    await open();
    wrapper
      .findComponent(ImageDropzone)
      .vm.$emit("files", [
        new File(["fixture"], "photo.png", { type: "image/png" }),
      ]);
    api.upload
      .mockRejectedValueOnce(new Error("Network"))
      .mockResolvedValueOnce([
        { id: "photo", url: "https://cdn/photo", sortOrder: 0 },
      ]);
    await submit();
    expect(
      document.body.querySelector('[role="alert"]')?.textContent,
    ).toContain("Đánh giá đã được lưu");
    expect(wrapper.emitted("saved")).toBeUndefined();
    expect(document.body.textContent).toContain("1/4");
    await submit();
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.update).toHaveBeenCalledWith(result.id, {
      rating: 5,
      content: null,
    });
    expect(api.upload).toHaveBeenCalledTimes(2);
    expect(wrapper.emitted("saved")).toHaveLength(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
  });
});
