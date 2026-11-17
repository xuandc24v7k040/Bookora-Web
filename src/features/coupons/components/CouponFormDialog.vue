<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import type { CouponResponseDto, SaveCouponDto } from "@/api/generated/models";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Switch from "@/components/ui/switch/Switch.vue";
import VndMoneyInput from "@/features/products/components/VndMoneyInput.vue";
import { couponFormSchema } from "../coupon-form";
import { couponMinute, couponTimeError, type CouponTimeField } from "../coupon-period";
import CouponDateTimePicker from "./CouponDateTimePicker.vue";

const props = defineProps<{
  open: boolean;
  coupon: CouponResponseDto | null;
  pending: boolean;
  serverError: string;
}>();
const emit = defineEmits<{
  "update:open": [value: boolean];
  save: [data: SaveCouponDto];
  clearError: [];
}>();
const form = reactive({
  code: "",
  name: "",
  description: "",
  type: "ORDER" as SaveCouponDto["type"],
  visibility: "PUBLIC" as SaveCouponDto["visibility"],
  discountType: "FIXED_AMOUNT" as SaveCouponDto["discountType"],
  discountValue: "",
  minOrderAmount: "",
  maxDiscount: "",
  usageLimit: "",
  usageLimitPerUser: "1",
  startAt: "",
  endAt: "",
  isActive: true,
});
const submitted = ref(false);
const timeEdited = ref(false);
const checkedAt = ref(Date.now());
const inputErrors = reactive<Record<string, string>>({});
const timeFields = [
  { key: "startAt", label: "Bắt đầu" },
  { key: "endAt", label: "Kết thúc" },
] as const;
const candidate = computed(() => ({
  ...form,
  code: form.code.trim().toUpperCase(),
  discountValue: form.discountValue === "" ? NaN : Number(form.discountValue),
  minOrderAmount:
    form.minOrderAmount === "" ? null : Number(form.minOrderAmount),
  maxDiscount: form.maxDiscount === "" ? null : Number(form.maxDiscount),
  usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
  usageLimitPerUser:
    form.usageLimitPerUser === "" ? null : Number(form.usageLimitPerUser),
}));
const validation = computed(() => couponFormSchema.safeParse(candidate.value));
const timeErrors = computed(() => ({
  startAt: couponTimeError("startAt", form, props.coupon, checkedAt.value),
  endAt: couponTimeError("endAt", form, props.coupon, checkedAt.value),
}));
const errors = computed(() => {
  const result: Record<string, string> = { ...inputErrors };
  if (submitted.value && !validation.value.success)
    for (const issue of validation.value.error.issues)
      result[String(issue.path[0])] ??= issue.message;
  if (submitted.value || timeEdited.value) {
    for (const { key } of timeFields) {
      const error = timeErrors.value[key];
      if (error) result[key] ??= error;
    }
  }
  return result;
});
watch(
  () => props.open,
  (open) => {
    if (!open) return;
    const row = props.coupon;
    checkedAt.value = Date.now();
    const startMinute = couponMinute(checkedAt.value);
    submitted.value = false;
    timeEdited.value = false;
    for (const key of Object.keys(inputErrors)) delete inputErrors[key];
    Object.assign(form, {
      code: row?.code ?? "",
      name: row?.name ?? "",
      description: row?.description ?? "",
      type: row?.type ?? "ORDER",
      visibility: row?.visibility ?? "PUBLIC",
      discountType: row?.discountType ?? "FIXED_AMOUNT",
      discountValue: row ? String(row.discountValue) : "",
      minOrderAmount:
        row?.minOrderAmount == null ? "" : String(row.minOrderAmount),
      maxDiscount: row?.maxDiscount == null ? "" : String(row.maxDiscount),
      usageLimit: row?.usageLimit == null ? "" : String(row.usageLimit),
      usageLimitPerUser: row
        ? row.usageLimitPerUser == null
          ? ""
          : String(row.usageLimitPerUser)
        : "1",
      startAt: row?.startAt ?? new Date(startMinute).toISOString(),
      endAt: row?.endAt ?? new Date(startMinute + 30 * 86_400_000).toISOString(),
      isActive: row?.isActive ?? true,
    });
  },
  { immediate: true },
);
watch(form, () => emit("clearError"));
function validateTime(field: CouponTimeField, value: string) {
  return couponTimeError(field, { ...form, [field]: value }, props.coupon, Date.now());
}

function updateTime(field: CouponTimeField, value: string) {
  form[field] = value;
  checkedAt.value = Date.now();
  timeEdited.value = true;
}

function guardMoney(event: Event, field: string): void {
  const value =
    event instanceof InputEvent
      ? event.data
      : event instanceof ClipboardEvent
        ? event.clipboardData?.getData("text")
        : null;
  if (value && !/^\d+$/.test(value) && !/^\d{1,3}(\.\d{3})+$/.test(value)) {
    event.preventDefault();
    inputErrors[field] =
      "Chỉ nhập số nguyên VND, không dùng số âm hoặc số thập phân.";
  } else delete inputErrors[field];
}
function save(): void {
  if (props.pending) return;
  checkedAt.value = Date.now();
  submitted.value = true;
  if (validation.value.success && !Object.keys(errors.value).length)
    emit("save", validation.value.data);
}
</script>

<template>
  <Dialog :open="open" @update:open="!pending && emit('update:open', $event)">
    <DialogContent
      class="flex h-[min(860px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
    >
      <DialogHeader class="shrink-0 border-b p-5 pr-12 text-left"
        ><DialogTitle>{{
          coupon ? "Chỉnh sửa khuyến mãi" : "Tạo mã giảm giá"
        }}</DialogTitle
        ><DialogDescription
          >Áp dụng toàn hệ thống. Đơn hàng đã chốt luôn giữ ưu đãi tại thời điểm
          mua.</DialogDescription
        ></DialogHeader
      >
      <ScrollArea class="min-h-0 flex-1 overflow-hidden">
        <form
          id="coupon-form"
          class="min-w-0 space-y-6 p-5"
          @submit.prevent="save"
        >
          <section aria-labelledby="coupon-general-heading" class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3 id="coupon-general-heading" class="text-sm font-semibold">Thông tin chung</h3>
              <div class="flex items-center gap-2">
                <Label for="coupon-active">Kích hoạt</Label>
                <Switch id="coupon-active" v-model="form.isActive" :disabled="pending" />
              </div>
            </div>
            <div class="grid min-w-0 gap-4 sm:grid-cols-2">
              <div>
                <Label for="coupon-code">Mã giảm giá</Label
                ><Input
                  id="coupon-code"
                  v-model="form.code"
                  maxlength="40"
                  class="mt-2 uppercase"
                  :disabled="pending"
                  :aria-invalid="!!errors.code"
                />
                <p v-if="errors.code" class="mt-1 text-xs text-destructive">
                  {{ errors.code }}
                </p>
              </div>
              <div>
                <Label for="coupon-name">Tên ưu đãi</Label
                ><Input
                  id="coupon-name"
                  v-model="form.name"
                  maxlength="120"
                  class="mt-2"
                  :disabled="pending"
                />
                <p v-if="errors.name" class="mt-1 text-xs text-destructive">
                  {{ errors.name }}
                </p>
              </div>
              <div>
                <Label for="coupon-type">Loại voucher</Label
                ><Select v-model="form.type" :disabled="pending"
                  ><SelectTrigger id="coupon-type" class="mt-2 w-full"
                    ><SelectValue /></SelectTrigger
                  ><SelectContent
                    ><SelectItem value="ORDER">Giảm giá đơn hàng</SelectItem
                    ><SelectItem value="SHIPPING"
                      >Giảm phí vận chuyển</SelectItem
                    ></SelectContent
                  ></Select
                >
              </div>
              <div>
                <Label for="coupon-visibility">Khả năng hiển thị</Label
                ><Select v-model="form.visibility" :disabled="pending"
                  ><SelectTrigger id="coupon-visibility" class="mt-2 w-full"
                    ><SelectValue /></SelectTrigger
                  ><SelectContent
                    ><SelectItem value="PUBLIC">Công khai tại checkout</SelectItem
                    ><SelectItem value="PRIVATE"
                      >Riêng tư, nhập mã để dùng</SelectItem
                    ></SelectContent
                  ></Select
                >
              </div>
              <div class="sm:col-span-2">
                <Label for="coupon-description">Mô tả (không bắt buộc)</Label>
                <Textarea
                  id="coupon-description"
                  v-model="form.description"
                  maxlength="500"
                  class="mt-2"
                  :disabled="pending"
                />
              </div>
            </div>
          </section>
          <section aria-labelledby="coupon-period-heading" class="space-y-3 border-t pt-5">
            <h3 id="coupon-period-heading" class="text-sm font-semibold">Thời gian hiệu lực</h3>
            <div class="grid min-w-0 gap-4 sm:grid-cols-2">
              <div v-for="field in timeFields" :key="field.key" class="min-w-0">
                <Label :for="`coupon-${field.key}`">{{ field.label }}</Label>
                <CouponDateTimePicker
                  :id="`coupon-${field.key}`"
                  :label="field.label"
                  :model-value="form[field.key]"
                  :earliest="field.key === 'endAt' ? form.startAt : undefined"
                  :error="errors[field.key]"
                  :validate="(value) => validateTime(field.key, value)"
                  :disabled="pending"
                  @update:model-value="updateTime(field.key, $event)"
                />
                <p v-if="errors[field.key]" :id="`coupon-${field.key}-error`" class="mt-1 text-xs text-destructive">
                  {{ errors[field.key] }}
                </p>
              </div>
            </div>
          </section>
          <section aria-labelledby="coupon-benefit-heading" class="space-y-3 border-t pt-5">
            <h3 id="coupon-benefit-heading" class="text-sm font-semibold">Mức giảm &amp; điều kiện</h3>
            <div class="grid min-w-0 gap-4 sm:grid-cols-2">
              <div>
                <Label for="coupon-discount-type">Hình thức giảm</Label
                ><Select
                  v-model="form.discountType"
                  :disabled="pending"
                  @update:model-value="
                    form.discountValue = '';
                    form.maxDiscount = '';
                  "
                  ><SelectTrigger id="coupon-discount-type" class="mt-2 w-full"
                    ><SelectValue /></SelectTrigger
                  ><SelectContent
                    ><SelectItem value="FIXED_AMOUNT">Số tiền cố định</SelectItem
                    ><SelectItem value="PERCENTAGE"
                      >Theo phần trăm</SelectItem
                    ></SelectContent
                  ></Select
                >
              </div>
              <div>
                <Label for="coupon-value">{{
                  form.discountType === "PERCENTAGE"
                    ? "Phần trăm giảm (%)"
                    : "Số tiền giảm"
                }}</Label
                ><Input
                  v-if="form.discountType === 'PERCENTAGE'"
                  id="coupon-value"
                  v-model="form.discountValue"
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  class="mt-2"
                  :disabled="pending"
                /><VndMoneyInput
                  v-else
                  id="coupon-value"
                  v-model="form.discountValue"
                  class="mt-2"
                  :disabled="pending"
                  @beforeinput="guardMoney($event, 'discountValue')"
                  @paste="guardMoney($event, 'discountValue')"
                />
                <p
                  v-if="errors.discountValue"
                  class="mt-1 text-xs text-destructive"
                >
                  {{ errors.discountValue }}
                </p>
              </div>
              <div>
                <Label for="coupon-min">Đơn hàng tối thiểu</Label
                ><VndMoneyInput
                  id="coupon-min"
                  v-model="form.minOrderAmount"
                  class="mt-2"
                  :disabled="pending"
                  @beforeinput="guardMoney($event, 'minOrderAmount')"
                  @paste="guardMoney($event, 'minOrderAmount')"
                />
                <p
                  v-if="errors.minOrderAmount"
                  class="mt-1 text-xs text-destructive"
                >
                  {{ errors.minOrderAmount }}
                </p>
              </div>
              <div v-if="form.discountType === 'PERCENTAGE'">
                <Label for="coupon-cap"
                  >Giảm tối đa (để trống nếu không giới hạn)</Label
                ><VndMoneyInput
                  id="coupon-cap"
                  v-model="form.maxDiscount"
                  class="mt-2"
                  :disabled="pending"
                  @beforeinput="guardMoney($event, 'maxDiscount')"
                  @paste="guardMoney($event, 'maxDiscount')"
                />
                <p v-if="errors.maxDiscount" class="mt-1 text-xs text-destructive">
                  {{ errors.maxDiscount }}
                </p>
              </div>
              <div
                v-for="field in ['usageLimit', 'usageLimitPerUser'] as const"
                :key="field"
              >
                <Label :for="`coupon-${field}`">{{
                  field === "usageLimit"
                    ? "Tổng lượt sử dụng"
                    : "Lượt dùng mỗi người"
                }}</Label
                ><Input
                  :id="`coupon-${field}`"
                  v-model="form[field]"
                  type="number"
                  min="1"
                  max="2147483647"
                  step="1"
                  placeholder="Không giới hạn"
                  class="mt-2"
                  :disabled="pending"
                />
                <p v-if="errors[field]" class="mt-1 text-xs text-destructive">
                  {{ errors[field] }}
                </p>
              </div>
            </div>
          </section>
          <p
            v-if="serverError"
            role="alert"
            class="text-sm text-destructive"
          >
            {{ serverError }}
          </p>
        </form>
      </ScrollArea>
      <DialogFooter class="shrink-0 border-t p-5"
        ><Button
          variant="outline"
          :disabled="pending"
          @click="emit('update:open', false)"
          >Hủy bỏ</Button
        ><Button type="submit" form="coupon-form" :disabled="pending">{{
          pending ? "Đang lưu..." : "Lưu khuyến mãi"
        }}</Button></DialogFooter
      >
    </DialogContent>
  </Dialog>
</template>
