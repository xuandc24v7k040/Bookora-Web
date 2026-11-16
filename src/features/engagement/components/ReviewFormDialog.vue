<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { BookOpen, LoaderCircle, Star, X } from "@lucide/vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { toast } from "vue-sonner";
import type {
  CustomerReviewDto,
  PendingReviewOpportunityDto,
} from "@/api/generated/models";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ImageDropzone from "@/components/shared/ImageDropzone.vue";
import { useReviewMediaForm } from "../composables/use-review-media-form";
import { toBookoraApiError } from "@/api/http/errors";
import { invalidateReviewProduct } from "../state/review-invalidation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  createReview,
  engagementKeys,
  updateReview,
} from "../api/engagement-api";
import { customerOrderKeys } from "@/features/orders/api/customer-orders-api";
import { publishEngagementChange } from "../state/engagement-sync";

const props = defineProps<{
  open: boolean;
  opportunity?: PendingReviewOpportunityDto | null;
  review?: CustomerReviewDto | null;
}>();
const emit = defineEmits<{ "update:open": [value: boolean]; saved: [] }>();
const rating = ref(5);
const content = ref("");
const imageError = ref("");
const validating = ref(false);
const media = useReviewMediaForm();
const variantLabel = computed(
  () => props.review?.variantLabel ?? props.opportunity?.variantLabel,
);
const queryClient = useQueryClient();
const product = computed(
  () => props.review?.product ?? props.opportunity?.product ?? null,
);
const ratingLabels = [
  "Rất tệ",
  "Tệ",
  "Bình thường",
  "Tốt",
  "Tuyệt vời",
] as const;

watch(
  () => [props.open, props.review, props.opportunity] as const,
  ([open, review]) => {
    media.reset(open ? review : null);
    validating.value = false;
    imageError.value = "";
    if (!open) return;
    rating.value = review?.rating ?? 5;
    content.value = review?.content ?? "";
  },
  { immediate: true },
);

const mutation = useMutation({
  mutationFn: async () => {
    const normalized = content.value.trim() || null;
    let result: CustomerReviewDto;
    const persisted = media.savedReview.value;
    if (persisted) {
      result = await updateReview(persisted.id, {
        rating: rating.value,
        content: normalized,
      });
    } else {
      if (!props.opportunity)
        throw new Error("Không tìm thấy lượt mua đã chọn.");
      result = await createReview({
        orderItemId: props.opportunity.orderItemId,
        orderId: props.opportunity.orderId,
        productId: props.opportunity.product.id,
        rating: rating.value,
        content: normalized,
      });
    }
    await media.saveMedia(result);
    return result;
  },
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: engagementKeys.reviews });
    void queryClient.invalidateQueries({ queryKey: engagementKeys.dashboard });
    void queryClient.invalidateQueries({ queryKey: customerOrderKeys.all });
    void queryClient.invalidateQueries({ queryKey: customerOrderKeys.details });
    if (product.value) {
      const changed = {
        productId: product.value.id,
        productSlug: product.value.slug,
      };
      invalidateReviewProduct(queryClient, changed);
      publishEngagementChange(changed);
    }
    toast.success(
      props.review ? "Đã cập nhật đánh giá." : "Đã gửi đánh giá của bạn.",
    );
    emit("saved");
    emit("update:open", false);
  },
  onError: (error) => {
    const apiError = toBookoraApiError(error);
    imageError.value = media.partial.value
      ? `Đánh giá đã được lưu. Chưa thể xác nhận đủ thay đổi ảnh. ${apiError.statusCode ? apiError.message : "Vui lòng kiểm tra kết nối và thử lại."}`
      : apiError.statusCode
        ? apiError.message
        : "Không thể gửi đánh giá. Vui lòng thử lại.";
    void queryClient.invalidateQueries({ queryKey: engagementKeys.reviews });
    if (product.value && media.savedReview.value) {
      const changed = {
        productId: product.value.id,
        productSlug: product.value.slug,
      };
      invalidateReviewProduct(queryClient, changed);
      publishEngagementChange(changed);
    }
  },
});

function submit(): void {
  if (mutation.isPending.value || validating.value) return;
  imageError.value = "";
  mutation.mutate();
}

function updateOpen(value: boolean): void {
  if (!value && (mutation.isPending.value || validating.value)) return;
  emit("update:open", value);
}
</script>

<template>
  <Dialog :open="open" @update:open="updateOpen">
    <DialogContent
      class="bookora-client grid max-h-[calc(100dvh-2rem)] max-w-xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0"
    >
      <DialogHeader class="px-5 pb-0 pt-4 sm:px-6">
        <DialogTitle>Đánh giá sản phẩm</DialogTitle>
      </DialogHeader>

      <ScrollArea type="auto" class="min-h-0">
        <DialogDescription as-child>
          <div
            class="flex min-w-0 items-center gap-3 border-b px-5 pb-4 pt-5 text-left sm:px-6"
          >
            <img
              v-if="product?.imageUrl"
              :src="product.imageUrl"
              :alt="`Bìa ${product.name}`"
              class="h-16 w-11 shrink-0 rounded border object-cover"
            />
            <span
              v-else
              class="grid h-16 w-11 shrink-0 place-items-center rounded border bg-muted"
            >
              <BookOpen class="size-5" />
            </span>
            <div class="min-w-0 space-y-1.5">
              <strong
                class="min-w-0 line-clamp-2 break-words text-sm text-foreground"
              >
                {{ product?.name }}
              </strong>
              <Badge
                v-if="variantLabel"
                variant="secondary"
                class="h-auto max-w-full whitespace-normal break-words bg-[var(--bookora-green)]/10 text-left text-[var(--bookora-green)] [overflow-wrap:anywhere]"
                >Phân loại: {{ variantLabel }}</Badge
              >
            </div>
          </div>
        </DialogDescription>
        <form
          id="review-form"
          class="space-y-6 px-5 py-5 sm:px-6"
          @submit.prevent="submit"
        >
          <fieldset>
            <legend class="text-sm font-semibold">Đánh giá chung</legend>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <button
                v-for="value in 5"
                :key="value"
                type="button"
                class="rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
                :aria-label="`${value} sao — ${ratingLabels[value - 1]}`"
                :aria-pressed="rating === value"
                @click="rating = value"
              >
                <Star
                  :class="[
                    'size-8',
                    value <= rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/50',
                  ]"
                />
              </button>
              <span class="ml-1 text-sm font-medium">
                {{ rating }} sao — {{ ratingLabels[rating - 1] }}
              </span>
            </div>
          </fieldset>

          <div>
            <label for="review-content" class="block text-sm font-semibold">
              Chia sẻ trải nghiệm của bạn
              <span class="font-normal text-muted-foreground">
                (không bắt buộc)
              </span>
            </label>
            <Textarea
              id="review-content"
              v-model="content"
              maxlength="2000"
              placeholder="Nội dung sách, chất lượng in ấn hoặc trải nghiệm nhận hàng..."
              class="mt-2 min-h-36 max-h-56 resize-y overflow-y-auto [scrollbar-color:var(--bookora-green)_transparent] [scrollbar-width:thin] focus-visible:border-[var(--bookora-green)]/35 focus-visible:ring-1 focus-visible:ring-[var(--bookora-green)]/15"
            />
            <p class="mt-1 text-right text-xs text-muted-foreground">
              {{ content.length }}/2000
            </p>
          </div>
          <section class="border-t pt-4" aria-label="Hình ảnh đánh giá">
            <div class="flex items-center justify-between gap-2 text-sm">
              <h3 class="font-semibold">
                Hình ảnh
                <span class="font-normal text-muted-foreground"
                  >(không bắt buộc)</span
                >
              </h3>
              <span class="text-muted-foreground"
                >{{ media.count.value }}/4</span
              >
            </div>
            <p class="mt-1 text-xs text-muted-foreground">
              Tối đa 4 ảnh · JPG, PNG, WebP · ≤ 5 MB
            </p>
            <div class="mt-3 flex gap-3 overflow-x-auto pb-2">
              <ImageDropzone
                v-if="media.count.value < 4"
                :model-value="null"
                multiple
                compact
                :max-files="4 - media.count.value"
                :disabled="mutation.isPending.value"
                class="shrink-0"
                @files="media.add"
                @invalid="imageError = $event"
                @valid="imageError = ''"
                @validating="validating = $event"
              />
              <div
                v-for="image in media.stored.value"
                :key="image.id"
                class="relative size-24 shrink-0 sm:size-28"
              >
                <img
                  :src="image.url"
                  alt="Ảnh đánh giá đã lưu"
                  class="size-full rounded-lg border object-cover"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  class="absolute right-1 top-1 size-8 rounded-full"
                  aria-label="Bỏ ảnh đã lưu khi lưu đánh giá"
                  :disabled="mutation.isPending.value"
                  @click="media.removeStored(image.id)"
                  ><X class="size-4"
                /></Button>
              </div>
              <div
                v-for="image in media.local.value"
                :key="image.id"
                class="relative size-24 shrink-0 sm:size-28"
              >
                <img
                  :src="image.url"
                  :alt="image.file.name"
                  class="size-full rounded-lg border object-cover"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  class="absolute right-1 top-1 size-8 rounded-full"
                  :aria-label="`Bỏ ảnh ${image.file.name}`"
                  :disabled="mutation.isPending.value"
                  @click="media.removeLocal(image.id)"
                  ><X class="size-4"
                /></Button>
              </div>
            </div>
            <p
              v-if="media.removed.value.length"
              class="mt-2 text-xs text-muted-foreground"
            >
              {{ media.removed.value.length }} ảnh sẽ được xóa khi lưu. Hủy để
              giữ ảnh.
            </p>
            <p
              v-if="imageError"
              role="alert"
              class="mt-2 text-sm text-destructive"
            >
              {{ imageError }}
            </p>
          </section>
        </form>
      </ScrollArea>

      <DialogFooter class="border-t bg-background px-5 py-4 sm:px-6">
        <Button
          variant="outline"
          type="button"
          :disabled="mutation.isPending.value || validating"
          @click="updateOpen(false)"
        >
          Hủy
        </Button>
        <Button
          type="submit"
          form="review-form"
          :disabled="mutation.isPending.value || validating"
          class="bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green)]/90"
        >
          <LoaderCircle
            v-if="mutation.isPending.value"
            class="size-4 animate-spin"
          />
          {{
            mutation.isPending.value
              ? "Đang lưu..."
              : review
                ? "Lưu đánh giá"
                : "Gửi đánh giá"
          }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
