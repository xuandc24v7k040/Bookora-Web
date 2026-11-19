<script setup lang="ts">
import { Input } from "@/components/ui/input";
import { computed } from "vue";
import FlashPriceModeToggle from "./FlashPriceModeToggle.vue";
import VndMoneyInput from "@/features/products/components/VndMoneyInput.vue";
import { formatVnd } from "@/features/products/utils/product-money";
import {
  flashPriceError,
  percentToVnd,
  vndToPercent,
  type FlashSaleFormRow,
} from "../flash-sale-form";
const row = defineModel<FlashSaleFormRow>({ required: true });
const props = defineProps<{ validate?: boolean }>();
const validationError = computed(() => {
  if (!props.validate && !row.value.flashPrice && !row.value.percent) return "";
  if (
    Number(row.value.flashPrice) >= row.value.catalogPrice &&
    row.value.flashPrice
  )
    return "≥ giá gốc";
  return flashPriceError(row.value);
});
const emit = defineEmits<{ error: [message: string] }>();
function updateVnd(value: string) {
  emit("error", "");
  row.value.flashPrice = value;
  row.value.percent = vndToPercent(row.value.catalogPrice, Number(value));
}
function updatePercent(value: string | number) {
  row.value.percent = String(value);
  try {
    row.value.flashPrice = String(
      percentToVnd(row.value.catalogPrice, String(value)),
    );
    emit("error", "");
  } catch {
    row.value.flashPrice = "";
    emit(
      "error",
      "Tỷ lệ giảm không hợp lệ: lớn hơn 0, nhỏ hơn 100, tối đa 2 chữ số thập phân.",
    );
  }
}
</script>
<template>
  <div class="space-y-1">
    <label
      v-if="row.mode === 'VND'"
      :for="`flash-price-${row.variantId}`"
      class="sr-only"
      >Giá Flash Sale {{ row.productName }}</label
    >
    <div class="flex min-w-52 items-start gap-1">
      <FlashPriceModeToggle
        v-model="row.mode"
        :class="row.mode === 'VND' ? 'mt-[3px]' : 'mt-px'"
      />
      <VndMoneyInput
        v-if="row.mode === 'VND'"
        :id="`flash-price-${row.variantId}`"
        :model-value="row.flashPrice"
        :error="validationError"
        class="min-w-28 flex-1 [&>p]:text-right"
        @update:model-value="updateVnd"
      />
      <div v-else class="relative min-w-24 flex-1">
        <Input
          :model-value="row.percent"
          inputmode="decimal"
          placeholder="0"
          class="pr-8"
          :aria-label="`Phần trăm giảm ${row.productName}`"
          :aria-invalid="!!validationError"
          :aria-describedby="
            validationError ? `flash-price-error-${row.variantId}` : undefined
          "
          @update:model-value="updatePercent"
        />
        <span
          class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
          >%</span
        >
      </div>
    </div>
    <p
      v-if="row.mode === 'PERCENT' && validationError"
      :id="`flash-price-error-${row.variantId}`"
      class="text-right text-xs text-destructive"
    >
      {{ validationError }}
    </p>
    <p
      v-if="!validationError"
      class="py-1 text-right text-sm font-semibold text-foreground"
    >
      {{
        row.mode === "VND"
          ? row.percent
            ? `−${row.percent}%`
            : "Nhập giá hợp lệ"
          : row.flashPrice
            ? `= ${formatVnd(Number(row.flashPrice))}`
            : "Nhập tỷ lệ hợp lệ"
      }}
    </p>
  </div>
</template>
