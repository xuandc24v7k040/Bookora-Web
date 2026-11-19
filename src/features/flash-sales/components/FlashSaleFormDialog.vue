<script setup lang="ts">
import { toast } from "vue-sonner";
import { computed, reactive, ref, watch } from "vue";
import { PackageOpen, Plus, SlidersHorizontal, Trash2 } from "@lucide/vue";
import type {
  FlashSaleResponseDto,
  FlashSaleVariantDto,
  SaveFlashSaleDto,
} from "@/api/generated/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import CouponDateTimePicker from "@/features/coupons/components/CouponDateTimePicker.vue";
import VndMoneyInput from "@/features/products/components/VndMoneyInput.vue";
import { formatVnd } from "@/features/products/utils/product-money";
import { couponMinute } from "@/features/coupons/coupon-period";
import {
  applyBulk,
  flashPriceError,
  flashSalePayload,
  flashSaleMetadataSchema,
  newFlashRow,
  rowError,
  vndToPercent,
  type FlashSaleFormRow,
  type PriceMode,
} from "../flash-sale-form";
import { flashStatusColors, flashStatusLabels } from "../flash-sale-utils";
import FlashPriceModeToggle from "./FlashPriceModeToggle.vue";
import FlashPriceInput from "./FlashPriceInput.vue";
import FlashVariantPicker from "./FlashVariantPicker.vue";
const props = defineProps<{
  open: boolean;
  sale: FlashSaleResponseDto | null;
  readonly: boolean;
  pending: boolean;
  serverError: string;
}>();
const emit = defineEmits<{
  "update:open": [value: boolean];
  save: [data: SaveFlashSaleDto, publish: boolean];
}>();
const form = reactive({ name: "", description: "", startAt: "", endAt: "" });
const rows = ref<FlashSaleFormRow[]>([]);
const pickerOpen = ref(false),
  bulkOpen = ref(false),
  error = ref(""),
  submitted = ref(false);
const pickerReturnFocus = ref<HTMLElement | null>(null);
const bulk = reactive({
  mode: "PERCENT" as PriceMode,
  price: "",
  quota: 1,
  limit: 1,
});
const confirmation = ref<"price" | "quota" | "limit" | "clear" | null>(null);
const totalQuota = computed(() =>
  rows.value.reduce((sum, row) => sum + (row.totalQuota || 0), 0),
);
const locked = computed(
  () =>
    props.readonly || (props.sale !== null && props.sale.status !== "DRAFT"),
);
const timeErrors = computed(() =>
  submitted.value
    ? {
        startAt: validateTime("startAt", form.startAt),
        endAt: validateTime("endAt", form.endAt),
      }
    : {},
);
const metadataErrors = computed<Record<string, string>>(() => {
  if (!submitted.value || locked.value) return {};
  const result = flashSaleMetadataSchema.safeParse(form);
  const errors: Record<string, string> = {};
  if (!result.success)
    for (const issue of result.error.issues)
      errors[String(issue.path[0])] ??= issue.message;
  return errors;
});
watch(
  () => props.open,
  (open) => {
    if (!open) {
      pickerOpen.value = false;
      confirmation.value = null;
      return;
    }
    const sale = props.sale;
    const now = couponMinute(Date.now());
    Object.assign(form, {
      name: sale?.name ?? "",
      description: sale?.description ?? "",
      startAt: sale?.startAt ?? new Date(now).toISOString(),
      endAt: sale?.endAt ?? new Date(now + 4 * 3600_000).toISOString(),
    });
    rows.value =
      sale?.items.map((item) => ({
        ...item,
        flashPrice: String(item.flashPrice),
        percent: vndToPercent(item.catalogPrice, item.flashPrice),
        mode: "VND",
      })) ?? [];
    error.value = "";
    submitted.value = false;
    bulkOpen.value = false;
    Object.assign(bulk, { mode: "PERCENT", price: "", quota: 1, limit: 1 });
  },
  { immediate: true },
);
watch(
  [form, rows],
  () => {
    error.value = "";
  },
  { deep: true },
);
function addVariants(items: FlashSaleVariantDto[]) {
  if (props.pending || locked.value) return;
  const added = [
    ...new Map(items.map((item) => [item.variantId, item])).values(),
  ]
    .filter(
      (item) => !rows.value.some((row) => row.variantId === item.variantId),
    )
    .map(newFlashRow);
  rows.value.push(...added);
  if (added.length)
    toast.success(
      `Đã thêm thành công ${added.length} biến thể vào chương trình.`,
    );
}
function openPicker(event: Event) {
  if (props.pending || locked.value) return;
  pickerReturnFocus.value =
    event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  pickerOpen.value = true;
}
function validateTime(
  field: "startAt" | "endAt",
  value: string,
): string | undefined {
  if (locked.value) return;
  if (
    field === "startAt" &&
    value !== props.sale?.startAt &&
    Date.parse(value) < couponMinute(Date.now())
  )
    return "Thời gian bắt đầu không được ở phút đã qua.";
  if (
    field === "endAt" &&
    (Date.parse(value) <= Date.parse(form.startAt) ||
      Date.parse(value) <= Date.now())
  )
    return "Kết thúc phải sau bắt đầu và sau thời điểm hiện tại.";
}
function save(publish: boolean) {
  if (props.pending || locked.value) return;
  submitted.value = true;
  error.value = "";
  try {
    const timeError =
      validateTime("startAt", form.startAt) ||
      validateTime("endAt", form.endAt);
    if (timeError) throw new Error(timeError);
    emit("save", flashSalePayload(form, rows.value), publish);
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : "Vui lòng kiểm tra thông tin.";
  }
}
function setAllModes(mode: PriceMode) {
  if (props.pending || locked.value || !rows.value.length) return;
  for (const row of rows.value) row.mode = mode;
  toast.info(
    mode === "VND"
      ? "Đã chuyển tất cả sang chế độ nhập giá cố định (₫)."
      : "Đã chuyển tất cả sang chế độ nhập theo %.",
  );
}
function confirmBulk() {
  const field = confirmation.value;
  confirmation.value = null;
  if (!field || props.pending || locked.value) return;
  if (field === "clear") {
    const count = rows.value.length;
    rows.value = [];
    bulkOpen.value = false;
    if (count)
      toast.success(`Đã xóa thành công ${count} biến thể khỏi chương trình.`);
    return;
  }
  try {
    rows.value = applyBulk(rows.value, field, String(bulk[field]), bulk.mode);
    error.value = "";
    const value =
      field === "price"
        ? bulk.mode === "VND"
          ? formatVnd(Number(bulk.price))
          : `${bulk.price}%`
        : bulk[field];
    const label =
      field === "price"
        ? "giá Flash Sale"
        : field === "quota"
          ? "quota"
          : "giới hạn/khách";
    const invalidCount =
      field === "price"
        ? rows.value.filter((row) => flashPriceError(row)).length
        : 0;
    toast.success(
      `Đã cấu hình ${label} ${value} cho ${rows.value.length} biến thể.`,
      invalidCount
        ? {
            description: `${invalidCount} biến thể có giá không hợp lệ. Vui lòng điều chỉnh trước khi lưu.`,
          }
        : undefined,
    );
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Giá trị không hợp lệ.";
    toast.error(error.value);
  }
}
</script>
<template>
  <Dialog
    :open="open"
    @update:open="
      (value) => {
        if (!pending) emit('update:open', value);
      }
    "
    ><DialogContent
      class="flex h-[min(900px,calc(100dvh-2rem))] max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
      @interact-outside="
        (event) => {
          if (pending) event.preventDefault();
        }
      "
      ><DialogHeader class="shrink-0 border-b p-5 pr-12 text-left"
        ><DialogTitle class="flex items-center gap-3"
          >{{
            locked
              ? "Chi tiết Flash Sale"
              : sale
                ? "Chỉnh sửa Flash Sale"
                : "Tạo Flash Sale"
          }}<Badge
            v-if="sale"
            variant="outline"
            class="rounded-full"
            :class="flashStatusColors[sale.status]"
            >{{ flashStatusLabels[sale.status] }}</Badge
          ></DialogTitle
        ><DialogDescription
          >Thiết lập khung giờ vàng, mức giá ưu đãi và số lượng suất bán giới
          hạn.</DialogDescription
        ></DialogHeader
      >
      <ScrollArea data-flash-sale-body class="min-h-0 flex-1 overflow-hidden">
        <div class="min-w-0 space-y-6 p-5">
          <section aria-labelledby="flash-general-heading">
            <fieldset :disabled="locked || pending" class="min-w-0 space-y-4">
              <legend
                id="flash-general-heading"
                class="mb-4 text-sm font-semibold"
              >
                Thông tin chương trình
              </legend>
              <div class="space-y-2">
                <Label for="flash-name"
                  >Tên chương trình
                  <span v-if="!locked" class="text-destructive">*</span></Label
                >
                <Input
                  id="flash-name"
                  v-model="form.name"
                  maxlength="120"
                  :aria-invalid="!!metadataErrors.name"
                  :aria-describedby="
                    metadataErrors.name ? 'flash-name-error' : undefined
                  "
                  placeholder="Ví dụ: Flash Sale sách hay 12h"
                />
                <p
                  v-if="metadataErrors.name"
                  id="flash-name-error"
                  class="text-xs text-destructive"
                >
                  {{ metadataErrors.name }}
                </p>
              </div>
              <div class="space-y-2">
                <Label for="flash-description"
                  >Mô tả ngắn (không bắt buộc)</Label
                >
                <Textarea
                  id="flash-description"
                  v-model="form.description"
                  maxlength="500"
                  :aria-invalid="!!metadataErrors.description"
                  placeholder="Ưu đãi sách hay trong khung giờ vàng..."
                />
                <p
                  v-if="metadataErrors.description"
                  class="text-xs text-destructive"
                >
                  {{ metadataErrors.description }}
                </p>
              </div>
              <p v-if="sale?.controlReason" class="text-sm">
                Lý do: {{ sale.controlReason }}
              </p>
            </fieldset>
          </section>
          <section
            aria-labelledby="flash-period-heading"
            class="space-y-3 border-t pt-5"
          >
            <h3 id="flash-period-heading" class="text-sm font-semibold">
              Thời gian áp dụng
            </h3>
            <fieldset
              :disabled="locked || pending"
              class="grid min-w-0 gap-4 sm:grid-cols-2"
            >
              <div class="min-w-0">
                <Label for="flash-start">Bắt đầu</Label>
                <CouponDateTimePicker
                  id="flash-start"
                  label="Bắt đầu"
                  v-model="form.startAt"
                  :disabled="locked || pending"
                  :error="timeErrors.startAt"
                  :validate="(value) => validateTime('startAt', value)"
                />
                <p
                  v-if="timeErrors.startAt"
                  id="flash-start-error"
                  class="mt-1 text-xs text-destructive"
                >
                  {{ timeErrors.startAt }}
                </p>
              </div>
              <div class="min-w-0">
                <Label for="flash-end">Kết thúc</Label>
                <CouponDateTimePicker
                  id="flash-end"
                  label="Kết thúc"
                  v-model="form.endAt"
                  :disabled="locked || pending"
                  :earliest="form.startAt"
                  :error="timeErrors.endAt"
                  :validate="(value) => validateTime('endAt', value)"
                />
                <p
                  v-if="timeErrors.endAt"
                  id="flash-end-error"
                  class="mt-1 text-xs text-destructive"
                >
                  {{ timeErrors.endAt }}
                </p>
              </div>
            </fieldset>
            <p class="text-xs leading-5 text-muted-foreground">
              Giờ Việt Nam (UTC+7). Quota dùng chung toàn hệ thống; kho mua hàng
              theo chi nhánh.
            </p>
          </section>
          <section
            aria-labelledby="flash-products-heading"
            class="min-w-0 space-y-4 border-t pt-5"
          >
            <header class="mb-4 flex shrink-0 flex-wrap items-center gap-2">
              <h3
                id="flash-products-heading"
                class="mr-1 text-sm font-semibold"
              >
                Sản phẩm tham gia
              </h3>
              <Badge variant="secondary">{{ rows.length }} biến thể</Badge
              ><Badge variant="outline">Tổng {{ totalQuota }} suất</Badge>
              <div v-if="!locked" class="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="!rows.length || pending"
                  @click="bulkOpen = !bulkOpen"
                  ><SlidersHorizontal class="size-4" />{{
                    bulkOpen ? "Đóng" : "Cài nhanh"
                  }}</Button
                ><Button size="sm" :disabled="pending" @click="openPicker"
                  ><Plus class="size-4" />Thêm sản phẩm</Button
                >
              </div>
            </header>
            <div
              v-if="bulkOpen && !locked"
              data-flash-bulk
              class="mb-3 shrink-0 rounded-lg border bg-muted/30 p-3"
            >
              <div class="mb-2 flex justify-between text-xs font-semibold">
                <span>Cài đặt nhanh cho {{ rows.length }} biến thể</span
                ><Button
                  size="sm"
                  variant="ghost"
                  class="h-auto p-0 text-destructive"
                  :disabled="pending"
                  @click="confirmation = 'clear'"
                  >Xóa tất cả</Button
                >
              </div>
              <div class="grid gap-3 md:grid-cols-3">
                <div class="min-w-0 space-y-2 rounded-md border p-2">
                  <Label for="bulk-price">Giá Flash Sale</Label>
                  <div class="flex min-w-0 items-center gap-1">
                    <FlashPriceModeToggle
                      v-model="bulk.mode"
                      label="Cách nhập giá hàng loạt"
                      :disabled="pending"
                    />
                    <VndMoneyInput
                      v-if="bulk.mode === 'VND'"
                      id="bulk-price"
                      v-model="bulk.price"
                      class="min-w-0 flex-1"
                      aria-label="Giá hàng loạt"
                    />
                    <div v-else class="relative min-w-0 flex-1">
                      <Input
                        id="bulk-price"
                        v-model="bulk.price"
                        class="pr-8"
                        inputmode="decimal"
                        placeholder="0"
                        aria-label="Phần trăm hàng loạt"
                      />
                      <span
                        class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
                        >%</span
                      >
                    </div>
                  </div>
                  <div class="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      :disabled="!rows.length || pending"
                      aria-label="Áp dụng giá hàng loạt"
                      @click="confirmation = 'price'"
                      >Áp dụng</Button
                    >
                  </div>
                </div>
                <div
                  v-for="field in ['quota', 'limit'] as const"
                  :key="field"
                  class="min-w-0 space-y-2 rounded-md border p-2"
                >
                  <Label :for="`bulk-${field}`">{{
                    field === "quota" ? "Quota" : "Giới hạn/khách"
                  }}</Label>
                  <Input
                    :id="`bulk-${field}`"
                    v-model.number="bulk[field]"
                    type="number"
                    min="1"
                    step="1"
                    inputmode="numeric"
                  />
                  <div class="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      :disabled="!rows.length || pending"
                      :aria-label="
                        field === 'quota'
                          ? 'Áp dụng quota hàng loạt'
                          : 'Áp dụng giới hạn/khách hàng loạt'
                      "
                      @click="confirmation = field"
                      >Áp dụng</Button
                    >
                  </div>
                </div>
              </div>
            </div>
            <div
              v-if="!rows.length"
              class="flex min-h-52 flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center"
            >
              <PackageOpen class="mb-3 size-10 text-muted-foreground" />
              <h4 class="font-semibold">
                Chưa có sản phẩm nào tham gia Flash Sale
              </h4>
              <p class="mt-2 max-w-md text-sm text-muted-foreground">
                Chọn các biến thể sách và thiết lập giá, quota cho khung giờ
                vàng này.
              </p>
            </div>
            <ScrollArea
              v-else
              data-flash-sale-table
              scrollbar-orientation="horizontal"
              class="w-full min-w-0 overflow-hidden rounded-lg border"
              ><table class="w-full min-w-[760px] text-sm">
                <thead class="bg-muted/50">
                  <tr class="text-left text-xs text-muted-foreground">
                    <th class="min-w-52 p-3">Sản phẩm & biến thể</th>
                    <th class="p-3">Giá gốc</th>
                    <th class="min-w-56 p-3">
                      <div class="flex items-center gap-2">
                        <span class="whitespace-nowrap">Giá Flash Sale</span>
                        <div v-if="!locked" class="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            class="h-6 px-2 text-[10px]"
                            @click="setAllModes('VND')"
                            >Tất cả ₫</Button
                          ><Button
                            size="sm"
                            variant="outline"
                            class="h-6 px-2 text-[10px]"
                            @click="setAllModes('PERCENT')"
                            >Tất cả %</Button
                          >
                        </div>
                      </div>
                    </th>
                    <th class="min-w-24 p-3">Quota</th>
                    <th class="min-w-24 p-3">Giới hạn/khách</th>
                    <th v-if="!locked" class="w-10 p-2">
                      <span class="sr-only">Xóa</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="(row, index) in rows" :key="row.variantId"
                    ><tr class="border-t align-top">
                      <td class="p-3">
                        <div class="flex gap-3">
                          <img
                            v-if="row.imageUrl"
                            :src="row.imageUrl"
                            alt=""
                            class="h-14 w-10 shrink-0 rounded border object-contain"
                          />
                          <div class="min-w-0">
                            <p class="line-clamp-2 font-medium">
                              {{ row.productName }}
                            </p>
                            <p class="mt-1 text-xs text-muted-foreground">
                              {{ row.variantLabel }} · SKU: {{ row.sku || "—" }}
                            </p>
                            <p class="mt-1 text-xs text-muted-foreground">
                              Tồn toàn hệ thống:
                              <strong class="text-foreground">{{
                                row.globalAvailableStock
                              }}</strong>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td class="whitespace-nowrap p-3">
                        {{ formatVnd(row.catalogPrice) }}
                      </td>
                      <td class="p-3">
                        <div v-if="locked" class="font-semibold">
                          {{ formatVnd(Number(row.flashPrice)) }}
                          <span class="text-xs text-muted-foreground">{{
                            row.percent ? `−${row.percent}%` : ""
                          }}</span>
                        </div>
                        <FlashPriceInput
                          v-else
                          v-model="rows[index]!"
                          :validate="submitted"
                          @error="error = $event"
                        />
                      </td>
                      <td class="p-3">
                        <span v-if="locked">{{ row.totalQuota }}</span
                        ><Input
                          v-else
                          v-model.number="row.totalQuota"
                          type="number"
                          min="1"
                          :max="row.globalAvailableStock"
                          class="w-20"
                          :aria-label="`Quota ${row.productName}`"
                        />
                      </td>
                      <td class="p-3">
                        <span v-if="locked">{{ row.maxQuantityPerUser }}</span
                        ><Input
                          v-else
                          v-model.number="row.maxQuantityPerUser"
                          type="number"
                          min="1"
                          :max="row.totalQuota"
                          class="w-20"
                          :aria-label="`Giới hạn ${row.productName}`"
                        />
                      </td>
                      <td v-if="!locked" class="p-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          :aria-label="`Xóa ${row.productName}`"
                          @click="rows.splice(index, 1)"
                          ><Trash2 class="size-4"
                        /></Button>
                      </td>
                    </tr>
                    <tr v-if="submitted && !locked && rowError(row)">
                      <td
                        colspan="6"
                        class="px-3 pb-2 text-xs text-destructive"
                      >
                        {{ rowError(row) }}
                      </td>
                    </tr>
                    <tr v-if="locked && sale?.items[index]">
                      <td
                        colspan="5"
                        class="px-3 pb-2 text-xs text-muted-foreground"
                      >
                        Đã dùng {{ sale.items[index]?.consumed }} · Đang giữ
                        {{ sale.items[index]?.reserved }} · Còn
                        {{ sale.items[index]?.remaining }} suất · Giá tham chiếu
                        lúc cấu hình:
                        {{ formatVnd(sale.items[index]!.referencePrice) }}
                      </td>
                    </tr></template
                  >
                </tbody>
              </table>
            </ScrollArea>
          </section>
        </div>
      </ScrollArea>
      <p
        v-if="error || serverError"
        role="alert"
        class="shrink-0 px-5 pb-3 text-sm text-destructive"
      >
        {{ error || serverError }}
      </p>
      <DialogFooter class="shrink-0 border-t bg-background p-5"
        ><Button
          variant="outline"
          :disabled="pending"
          @click="emit('update:open', false)"
          >{{ locked ? "Đóng" : "Hủy bỏ" }}</Button
        ><template v-if="!locked"
          ><Button variant="outline" :disabled="pending" @click="save(false)">{{
            pending ? "Đang lưu..." : "Lưu nháp"
          }}</Button
          ><Button :disabled="pending" @click="save(true)"
            >Lưu & công bố</Button
          ></template
        ></DialogFooter
      >
    </DialogContent></Dialog
  >
  <FlashVariantPicker
    v-model:open="pickerOpen"
    :existing="rows.map((row) => row.variantId)"
    :return-focus-to="open ? pickerReturnFocus : null"
    @add="addVariants"
  />
  <AlertDialog
    :open="confirmation !== null"
    @update:open="
      (value) => {
        if (!value) confirmation = null;
      }
    "
    ><AlertDialogContent
      ><AlertDialogHeader
        ><AlertDialogTitle>{{
          confirmation === "clear"
            ? "Xóa tất cả biến thể?"
            : "Áp dụng hàng loạt?"
        }}</AlertDialogTitle
        ><AlertDialogDescription>{{
          confirmation === "clear"
            ? "Các cấu hình sản phẩm trong form sẽ bị xóa."
            : "Các giá trị của nhóm đã chọn sẽ được ghi đè cho tất cả biến thể. Các nhóm còn lại được giữ nguyên."
        }}</AlertDialogDescription></AlertDialogHeader
      ><AlertDialogFooter
        ><AlertDialogCancel>Hủy</AlertDialogCancel
        ><Button @click="confirmBulk">Xác nhận</Button></AlertDialogFooter
      ></AlertDialogContent
    ></AlertDialog
  >
</template>
