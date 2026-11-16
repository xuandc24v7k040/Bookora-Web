import { computed, onBeforeUnmount, ref } from "vue";
import type { CustomerReviewDto, ReviewMediaDto } from "@/api/generated/models";
import {
  deleteReviewImage,
  listMyReviews,
  uploadReviewImages,
} from "../api/engagement-api";

type LocalImage = { id: string; file: File; url: string };

/** Deferred deletion makes Cancel safe; confirmed review identity survives upload failures. */
export function useReviewMediaForm() {
  const savedReview = ref<CustomerReviewDto | null>(null);
  const stored = ref<ReviewMediaDto[]>([]);
  const local = ref<LocalImage[]>([]);
  const removed = ref<ReviewMediaDto[]>([]);
  const partial = ref(false);
  let needsSync = false;
  let knownMediaIds = new Set<string>();
  const count = computed(() => stored.value.length + local.value.length);

  function clearLocal() {
    for (const image of local.value) URL.revokeObjectURL(image.url);
    local.value = [];
  }

  function reset(review?: CustomerReviewDto | null) {
    clearLocal();
    stored.value = [...(review?.media ?? [])];
    removed.value = [];
    savedReview.value = review ?? null;
    partial.value = false;
    needsSync = false;
    knownMediaIds = new Set(stored.value.map((image) => image.id));
  }

  function add(files: File[]) {
    if (count.value + files.length > 4) return;
    local.value.push(
      ...files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
      })),
    );
  }

  function removeLocal(id: string) {
    const image = local.value.find((image) => image.id === id);
    if (image) URL.revokeObjectURL(image.url);
    local.value = local.value.filter((image) => image.id !== id);
  }

  function removeStored(id: string) {
    const image = stored.value.find((image) => image.id === id);
    if (image) removed.value.push(image);
    stored.value = stored.value.filter((image) => image.id !== id);
  }

  async function saveMedia(review: CustomerReviewDto) {
    savedReview.value = review;
    partial.value = true;
    // A lost HTTP response may have committed on the server. Reconcile before retry.
    if (needsSync) await reconcile(review);
    knownMediaIds = new Set(
      [...stored.value, ...removed.value].map((image) => image.id),
    );
    needsSync = true;
    try {
      for (const image of [...removed.value]) {
        await deleteReviewImage(review.id, image.id);
        removed.value = removed.value.filter((item) => item.id !== image.id);
      }
      if (local.value.length) {
        stored.value = await uploadReviewImages(
          review.id,
          local.value.map((image) => image.file),
        );
        clearLocal();
      }
      needsSync = false;
      partial.value = false;
    } catch (error) {
      await reconcile(review).catch(() => {
        /* Retry must synchronize before another write. */
      });
      throw error;
    }
  }

  async function reconcile(review: CustomerReviewDto) {
    let page = 1;
    while (true) {
      const result = await listMyReviews({
        orderId: review.orderId,
        page,
        limit: 20,
      });
      const canonical = result.items.find((item) => item.id === review.id);
      if (canonical) {
        if (canonical.media.some((image) => !knownMediaIds.has(image.id)))
          clearLocal();
        stored.value = [...canonical.media];
        const existingIds = new Set(canonical.media.map((image) => image.id));
        removed.value = removed.value.filter((image) =>
          existingIds.has(image.id),
        );
        stored.value = stored.value.filter(
          (image) => !removed.value.some((removed) => removed.id === image.id),
        );
        needsSync = false;
        return;
      }
      if (page >= result.totalPages)
        throw new Error("Không thể tải lại đánh giá đã lưu.");
      page += 1;
    }
  }

  onBeforeUnmount(clearLocal);
  return {
    savedReview,
    stored,
    local,
    removed,
    partial,
    count,
    reset,
    add,
    removeLocal,
    removeStored,
    saveMedia,
  };
}
