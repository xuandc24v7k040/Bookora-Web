<script setup lang="ts">
import { ref, watch } from "vue";
import VueEasyLightbox from "vue-easy-lightbox";
import type { ReviewMediaDto } from "@/api/generated/models";

const props = defineProps<{ media: ReviewMediaDto[] }>();
const index = ref(0);
const visible = ref(false);
watch(
  () => props.media,
  () => {
    visible.value = false;
    index.value = 0;
  },
);
</script>

<template>
  <div
    v-if="media.length"
    class="mt-3 flex min-w-0 gap-2"
    aria-label="Ảnh đánh giá"
  >
    <button
      v-for="(image, position) in media.slice(0, 3)"
      :key="image.id"
      type="button"
      class="relative aspect-square w-[calc((100%-1rem)/3)] max-w-20 overflow-hidden rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
      :aria-label="`Xem ảnh đánh giá ${position + 1}${position === 2 ? ` và ${media.length - 3} ảnh tiếp theo` : ''}`"
      @click="
        index = position;
        visible = true;
      "
    >
      <img
        :src="image.url"
        :alt="`Ảnh đánh giá ${position + 1}`"
        loading="lazy"
        class="size-full object-cover"
      />
      <span
        v-if="position === 2"
        class="absolute inset-0 grid place-items-center bg-black/45 text-xl font-semibold text-white"
        >+{{ media.length - 2 }}</span
      >
    </button>
    <VueEasyLightbox
      :visible="visible"
      :imgs="media.map((image) => image.url)"
      :index="index"
      :loop="media.length > 1"
      @hide="visible = false"
    />
  </div>
</template>
