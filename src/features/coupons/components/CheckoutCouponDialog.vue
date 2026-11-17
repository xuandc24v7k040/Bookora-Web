<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { BookOpen, Copy, LoaderCircle, Ticket } from "@lucide/vue";
import { toast } from "vue-sonner";
import type {
  CheckoutCouponDto,
  CheckoutPreviewResponseDto,
  PreviewCheckoutDto,
} from "@/api/generated/models";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { previewCheckout } from "@/features/checkout/api/checkout-api";
import { formatVnd } from "@/features/products/utils/product-money";
import { couponBenefit, couponErrorMessage } from "../coupon-utils";

const props = defineProps<{
  open: boolean;
  context: PreviewCheckoutDto;
  contextKey: string;
}>();
const emit = defineEmits<{
  "update:open": [value: boolean];
  confirm: [preview: CheckoutPreviewResponseDto];
}>();
const coupons = ref<CheckoutCouponDto[]>([]);
const orderCode = ref("");
const shippingCode = ref("");
const enteredCode = ref("");
const errorMessage = ref("");
const pending = ref(false);
const copying = ref(false);
let controller: AbortController | undefined;
let sequence = 0;
const groups = computed(() => [
  {
    type: "ORDER",
    title: "Voucher giảm giá đơn hàng",
    cards: coupons.value.filter((row) => row.type === "ORDER"),
  },
  {
    type: "SHIPPING",
    title: "Voucher vận chuyển",
    cards: coupons.value.filter((row) => row.type === "SHIPPING"),
  },
]);

async function copyCode(code: string): Promise<void> {
  if (copying.value) return;
  copying.value = true;
  const toastId = "checkout-coupon-copy";
  try {
    await navigator.clipboard.writeText(code);
    toast.success(`Đã sao chép mã ${code}.`, { id: toastId });
  } catch {
    toast.error("Không thể sao chép mã. Vui lòng thử lại hoặc sao chép thủ công.", { id: toastId });
  } finally {
    copying.value = false;
  }
}

function selection(): PreviewCheckoutDto {
  const {
    orderCouponCode: _order,
    shippingCouponCode: _shipping,
    couponCode: _code,
    ...context
  } = props.context;
  return {
    ...context,
    ...(orderCode.value ? { orderCouponCode: orderCode.value } : {}),
    ...(shippingCode.value ? { shippingCouponCode: shippingCode.value } : {}),
    includeCoupons: true,
  };
}

async function request(mode: "load" | "apply" | "confirm"): Promise<void> {
  if (pending.value) return;
  const input = enteredCode.value.trim().toUpperCase();
  if (mode === "apply" && !/^[A-Z0-9_-]{3,40}$/.test(input)) {
    errorMessage.value =
      "Nhập mã từ 3–40 ký tự, gồm chữ, số, dấu gạch ngang hoặc gạch dưới.";
    return;
  }
  controller?.abort();
  controller = new AbortController();
  const current = ++sequence;
  const key = props.contextKey;
  pending.value = true;
  errorMessage.value = "";
  try {
    const preview = await previewCheckout(
      { ...selection(), ...(mode === "apply" ? { couponCode: input } : {}) },
      controller.signal,
    );
    if (current !== sequence || !props.open || key !== props.contextKey) return;
    coupons.value = preview.availableCoupons;
    orderCode.value =
      preview.appliedCoupons.find((row) => row.type === "ORDER")?.code ?? "";
    shippingCode.value =
      preview.appliedCoupons.find((row) => row.type === "SHIPPING")?.code ?? "";
    if (mode === "apply") enteredCode.value = "";
    if (mode === "confirm") {
      emit("confirm", preview);
      emit("update:open", false);
    }
  } catch (error: unknown) {
    if (current === sequence && !controller?.signal.aborted)
      errorMessage.value = couponErrorMessage(error);
  } finally {
    if (current === sequence) pending.value = false;
  }
}

watch(
  () => props.open,
  (open) => {
    controller?.abort();
    ++sequence;
    pending.value = false;
    if (!open) return;
    orderCode.value = props.context.orderCouponCode ?? "";
    shippingCode.value = props.context.shippingCouponCode ?? "";
    enteredCode.value = "";
    coupons.value = [];
    errorMessage.value = "";
    const key = props.contextKey;
    void request("load").then(async () => {
      if (!props.open || key !== props.contextKey || !errorMessage.value)
        return;
      const reason = errorMessage.value;
      // An unavailable selection must not prevent loading alternatives or clearing it.
      orderCode.value = "";
      shippingCode.value = "";
      await request("load");
      if (props.open && key === props.contextKey) errorMessage.value = reason;
    });
  },
);
watch(
  () => props.contextKey,
  () => {
    if (props.open) emit("update:open", false);
  },
);
onBeforeUnmount(() => {
  controller?.abort();
  ++sequence;
});
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="bookora-client flex h-[min(740px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 [--color-primary:var(--bookora-green)] [--color-ring:var(--bookora-green)] sm:max-w-xl"
    >
      <DialogHeader class="shrink-0 px-5 pt-5 pb-4 text-left sm:px-6">
        <DialogTitle>Chọn mã giảm giá</DialogTitle>
        <DialogDescription class="sr-only"
          >Chọn tối đa một voucher đơn hàng và một voucher vận
          chuyển.</DialogDescription
        >
      </DialogHeader>
      <ScrollArea class="min-h-0 flex-1 overflow-hidden" type="auto">
        <div class="space-y-5 px-5 pt-1 pb-5 sm:px-6">
          <form class="flex gap-2" @submit.prevent="request('apply')">
            <div class="relative min-w-0 flex-1">
              <Ticket
                class="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
              />
              <Input
                v-model="enteredCode"
                aria-label="Mã voucher"
                placeholder="Nhập mã voucher..."
                maxlength="40"
                class="pl-9"
                :disabled="pending"
                @update:model-value="errorMessage = ''"
              />
            </div>
            <Button type="submit" :disabled="pending">Áp dụng</Button>
          </form>
          <p v-if="errorMessage" role="alert" class="text-sm text-destructive">
            {{ errorMessage }}
          </p>
          <div
            v-if="pending && !coupons.length"
            role="status"
            class="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"
          >
            <LoaderCircle class="size-4 animate-spin" />Đang tải voucher...
          </div>
          <section v-for="group in groups" :key="group.type" class="space-y-3">
            <h3 :id="`coupon-group-${group.type}`" class="font-semibold">
              {{ group.title }}
            </h3>
            <RadioGroup
              :aria-labelledby="`coupon-group-${group.type}`"
              :model-value="group.type === 'ORDER' ? orderCode : shippingCode"
              :disabled="pending"
              @update:model-value="
                group.type === 'ORDER'
                  ? (orderCode = String($event))
                  : (shippingCode = String($event))
              "
            >
              <div
                v-for="coupon in group.cards"
                :key="coupon.code"
                class="flex min-w-0 items-center gap-3 rounded-xl border p-3 transition-colors sm:p-4"
                :class="[
                  !coupon.selectable
                    ? 'bg-muted/40 text-muted-foreground'
                    : '',
                  (group.type === 'ORDER' ? orderCode : shippingCode) ===
                    coupon.code && coupon.selectable
                    ? 'border-primary/50 bg-primary/5'
                    : '',
                ]"
              >
                <Label
                  :for="`voucher-${coupon.code}`"
                  class="hidden w-16 shrink-0 flex-col items-center gap-1 border-r pr-3 text-primary min-[360px]:flex"
                  :class="coupon.selectable ? 'cursor-pointer' : 'cursor-not-allowed'"
                >
                  <BookOpen class="size-6" />
                  <span class="text-xs font-bold">Bookora</span>
                </Label>
                <div class="min-w-0 flex-1 space-y-1">
                  <Label
                    :for="`voucher-${coupon.code}`"
                    class="block space-y-1"
                    :class="coupon.selectable ? 'cursor-pointer' : 'cursor-not-allowed'"
                  >
                    <strong class="block text-sm leading-5">{{ couponBenefit(coupon) }}</strong>
                    <span class="block text-xs text-muted-foreground">Đơn từ {{ formatVnd(coupon.minOrderAmount) }}</span>
                    <span v-if="!coupon.selectable" class="block text-xs text-destructive">{{ coupon.reasonMessage }}</span>
                  </Label>
                  <div class="inline-flex max-w-full items-center gap-1 rounded-full border bg-background pl-2 text-xs">
                    <Label
                      :for="`voucher-${coupon.code}`"
                      class="min-w-0 break-all text-xs leading-4"
                      :class="coupon.selectable ? 'cursor-pointer' : 'cursor-not-allowed'"
                    >{{ coupon.code }}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      class="size-7 shrink-0 rounded-full"
                      :aria-label="`Sao chép mã ${coupon.code}`"
                      :title="`Sao chép mã ${coupon.code}`"
                      :disabled="copying"
                      @click.stop="copyCode(coupon.code)"
                    ><Copy aria-hidden="true" class="size-3.5" /></Button>
                  </div>
                </div>
                <RadioGroupItem
                  :id="`voucher-${coupon.code}`"
                  :value="coupon.code"
                  :disabled="!coupon.selectable || pending"
                  class="shrink-0"
                />
              </div>
            </RadioGroup>
            <p
              v-if="!group.cards.length && !pending"
              class="text-sm text-muted-foreground"
            >
              Chưa có voucher trong nhóm này.
            </p>
            <Button
              v-if="group.type === 'ORDER' ? orderCode : shippingCode"
              variant="ghost"
              size="sm"
              :disabled="pending"
              @click="
                group.type === 'ORDER' ? (orderCode = '') : (shippingCode = '')
              "
              >Bỏ chọn voucher
              {{ group.type === "ORDER" ? "đơn hàng" : "vận chuyển" }}</Button
            >
          </section>
          <Button
            v-if="errorMessage"
            variant="outline"
            size="sm"
            :disabled="pending"
            @click="request('load')"
            >Tải lại voucher</Button
          >
        </div>
      </ScrollArea>
      <DialogFooter class="shrink-0 border-t p-5 sm:p-6">
        <Button
          class="h-11 w-full"
          :disabled="pending"
          @click="request('confirm')"
          ><LoaderCircle v-if="pending" class="size-4 animate-spin" />Xác nhận
          voucher</Button
        >
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
