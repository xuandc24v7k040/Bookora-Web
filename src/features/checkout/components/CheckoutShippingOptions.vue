<script setup lang="ts">
import { CalendarClock, PackageCheck, RefreshCw } from "@lucide/vue";
import type {
  GhnShippingQuoteDto,
  ShippingQuoteResponseDto,
} from "@/api/generated/models";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { formatVnd } from "@/features/products/utils/product-money";
import { formatShippingEta } from "@/features/checkout/utils/shipping-eta";

defineProps<{
  modelValue: "INTERNAL" | "GHN";
  internalQuote: ShippingQuoteResponseDto | null;
  internalRoute: string;
  ghnEnabled: boolean;
  ghnQuote: GhnShippingQuoteDto | null;
  ghnLoading: boolean;
  ghnError: string | null;
  hasAddress: boolean;
  disabled?: boolean;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: "INTERNAL" | "GHN"];
  retry: [];
}>();
function select(value: unknown): void {
  if (value === "INTERNAL" || value === "GHN") emit("update:modelValue", value);
}
</script>

<template>
  <RadioGroup
    :model-value="modelValue"
    :disabled="disabled"
    aria-label="Phương thức vận chuyển"
    class="gap-3"
    @update:model-value="select"
  >
    <div
      class="min-w-0 rounded-xl border transition-colors"
      :class="
        modelValue === 'INTERNAL'
          ? 'border-[var(--bookora-green)] bg-green-50/60 ring-1 ring-[var(--bookora-green)]/10'
          : 'border-slate-200 bg-white hover:border-green-300'
      "
    >
      <Label
        for="shipping-internal"
        class="flex min-w-0 cursor-pointer items-start gap-3 p-3.5 sm:p-4"
      >
        <RadioGroupItem
          id="shipping-internal"
          value="INTERNAL"
          class="mt-1 cursor-pointer text-[var(--bookora-green)] data-[state=checked]:border-[var(--bookora-green)] focus-visible:ring-[var(--bookora-green)]/30"
        />
        <div class="min-w-0 flex-1">
          <div
            class="flex flex-wrap items-start justify-between gap-x-3 gap-y-1"
          >
            <span class="flex items-center gap-2 font-semibold"
              ><PackageCheck
                class="size-4 shrink-0 text-[var(--bookora-green)]"
              />Giao hàng tiêu chuẩn</span
            >
            <strong class="whitespace-nowrap text-sm">{{
              internalQuote ? formatVnd(internalQuote.shippingFee) : "—"
            }}</strong>
          </div>
          <p class="mt-1 text-xs font-normal leading-5 text-slate-500">
            Phí theo tuyến, loại địa chỉ và khối lượng tính cước
          </p>
          <div
            v-if="internalQuote"
            class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-normal text-slate-600"
          >
            <span
              >Trọng lượng tính cước:
              <strong
                >{{
                  internalQuote.chargeableWeightGram.toLocaleString("vi-VN")
                }}
                g</strong
              ></span
            >
            <span
              >Tuyến: <strong>{{ internalRoute }}</strong></span
            >
          </div>
        </div>
      </Label>
    </div>
    <div
      v-if="ghnEnabled"
      class="min-w-0 rounded-xl border transition-colors"
      :class="
        modelValue === 'GHN'
          ? 'border-[var(--bookora-green)] bg-green-50/60 ring-1 ring-[var(--bookora-green)]/10'
          : 'border-slate-200 bg-white'
      "
    >
      <Label
        for="shipping-ghn"
        class="flex min-w-0 items-start gap-3 p-3.5 sm:p-4"
        :class="
          ghnQuote && !ghnLoading && !disabled
            ? 'cursor-pointer hover:bg-green-50/40'
            : 'cursor-default'
        "
      >
        <RadioGroupItem
          id="shipping-ghn"
          value="GHN"
          :disabled="!ghnQuote || ghnLoading"
          aria-describedby="shipping-ghn-status"
          class="mt-1 cursor-pointer text-[var(--bookora-green)] data-[state=checked]:border-[var(--bookora-green)] focus-visible:ring-[var(--bookora-green)]/30"
        />
        <div class="min-w-0 flex-1">
          <div
            class="flex flex-wrap items-start justify-between gap-x-3 gap-y-1"
          >
            <span class="flex items-center gap-2 font-semibold">
              <span>Giao Hàng Nhanh</span>
              <span aria-hidden="true" class="h-4 border-l border-slate-200" />
              <img
                :src="'/ghn-logo.png'"
                alt=""
                width="700"
                height="400"
                class="h-auto w-14 shrink-0 object-contain"
              />
            </span>
            <Skeleton v-if="ghnLoading" class="ml-auto h-5 w-20" />
            <strong v-else class="ml-auto whitespace-nowrap text-sm">{{
              ghnQuote ? formatVnd(ghnQuote.shippingFee) : "—"
            }}</strong>
          </div>
          <div
            id="shipping-ghn-status"
            aria-live="polite"
            class="mt-1 text-xs font-normal leading-5"
          >
            <Skeleton
              v-if="ghnLoading"
              class="mt-1 h-4 w-full max-w-52"
              aria-label="Đang lấy phí và ngày giao hàng GHN"
            />
            <p
              v-else-if="ghnQuote"
              class="flex flex-wrap items-center gap-1.5 text-slate-600"
            >
              <CalendarClock class="size-3.5 shrink-0" />Dự kiến giao hàng:
              <strong>{{
                formatShippingEta(ghnQuote.estimatedDeliveryAt)
              }}</strong>
            </p>
            <p v-else-if="ghnError" class="text-amber-800">{{ ghnError }}</p>
            <p v-else class="text-slate-500">
              {{
                hasAddress
                  ? "Đang chuẩn bị báo giá GHN…"
                  : "Chọn địa chỉ để xem phí và ngày giao dự kiến."
              }}
            </p>
          </div>
        </div>
      </Label>
      <div v-if="ghnError && hasAddress" class="px-4 pb-3 pl-11">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="cursor-pointer border-green-200 text-[var(--bookora-green)] hover:bg-green-50 focus-visible:ring-[var(--bookora-green)]/30"
          :disabled="ghnLoading || disabled"
          @click.stop="emit('retry')"
          ><RefreshCw class="size-3.5" />Thử lại GHN</Button
        >
      </div>
    </div>
  </RadioGroup>
</template>
