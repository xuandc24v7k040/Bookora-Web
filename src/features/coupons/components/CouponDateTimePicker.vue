<script setup lang="ts">
import { computed, nextTick, ref, shallowRef } from "vue";
import { CalendarDays, Clock3 } from "@lucide/vue";
import {
  parseAbsolute,
  toCalendarDate,
  type DateValue,
} from "@internationalized/date";
import { RadioGroupItem, RadioGroupRoot } from "reka-ui";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateTime } from "@/lib/date-format";
import { couponMinute, COUPON_TIME_ZONE } from "../coupon-period";

const props = defineProps<{
  id: string;
  label: string;
  modelValue: string;
  earliest?: string;
  disabled?: boolean;
  error?: string;
  validate: (value: string) => string | undefined;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const open = ref(false);
const draft = shallowRef(parseAbsolute(new Date().toISOString(), COUPON_TIME_ZONE));
const minimumDay = shallowRef(toCalendarDate(draft.value));
const draftError = ref("");
const timePanel = ref<HTMLElement | null>(null);
const anchor = ref<HTMLElement | null>(null);
const collisionBoundary = shallowRef<Element | null>(null);
const selectedDay = computed(() => toCalendarDate(draft.value));
const formattedDateTime = computed(() => formatDateTime(props.modelValue).split(" ", 2));
const timeLists = [
  { field: "hour", label: "Giờ", options: Array.from({ length: 24 }, (_, i) => i) },
  { field: "minute", label: "Phút", options: Array.from({ length: 60 }, (_, i) => i) },
] as const;

const twoDigits = (value: number) => String(value).padStart(2, "0");

function setOpen(value: boolean) {
  if (value) {
    const now = Date.now();
    const earliest = Math.max(now, Date.parse(props.earliest ?? "") || now);
    minimumDay.value = toCalendarDate(parseAbsolute(new Date(earliest).toISOString(), COUPON_TIME_ZONE));
    draft.value = parseAbsolute(props.modelValue, COUPON_TIME_ZONE);
    draftError.value = "";
    collisionBoundary.value = anchor.value?.closest('[data-slot="scroll-area-viewport"]') ?? null;
  }
  open.value = value;
}

async function revealSelectedTime() {
  await nextTick();
  for (const viewport of timePanel.value?.querySelectorAll<HTMLElement>(
    '[data-slot="scroll-area-viewport"]',
  ) ?? []) {
    const selected = viewport.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!selected) continue;
    viewport.scrollTop = selected.offsetTop - (viewport.clientHeight - selected.offsetHeight) / 2;
  }
}

function selectDay(value: DateValue | undefined) {
  if (!value) return;
  const { year, month, day } = value;
  draft.value = draft.value.set({ year, month, day });
  draftError.value = "";
}

function selectTime(field: "hour" | "minute", value: unknown) {
  if (typeof value !== "number") return;
  draft.value = draft.value.set({ [field]: value });
  draftError.value = "";
}

function selectNow() {
  draft.value = parseAbsolute(new Date(couponMinute(Date.now())).toISOString(), COUPON_TIME_ZONE);
  draftError.value = "";
  void revealSelectedTime();
}

function confirm() {
  if (props.disabled) return;
  const timestamp = couponMinute(draft.value.toDate().getTime());
  // Reconfirming the same visible minute keeps a saved timestamp's seconds intact.
  const value = timestamp === couponMinute(Date.parse(props.modelValue))
    ? props.modelValue
    : new Date(timestamp).toISOString();
  draftError.value = props.validate(value) ?? "";
  if (draftError.value) return;
  emit("update:modelValue", value);
  setOpen(false);
}
</script>

<template>
  <Popover :open="open" @update:open="setOpen">
    <div ref="anchor">
      <PopoverTrigger as-child>
        <Button
          :id="id"
          type="button"
          variant="outline"
          class="mt-2 w-full min-w-0 justify-start gap-2 px-3 font-normal"
          :disabled="disabled"
          :aria-invalid="!!error"
          :aria-describedby="error ? `${id}-error` : undefined"
        >
          <CalendarDays aria-hidden="true" class="size-4 text-muted-foreground" />
          <time
            :datetime="modelValue || undefined"
            class="flex min-w-0 flex-1 items-center justify-between gap-2 tabular-nums"
          >
            <span>{{ formattedDateTime[0] }}</span>
            <span v-if="formattedDateTime[1]" class="truncate text-right">
              {{ ` ${formattedDateTime[1]}` }}
            </span>
          </time>
        </Button>
      </PopoverTrigger>
    </div>
    <PopoverContent
      align="start"
      :aria-label="`Chọn thời điểm ${label.toLowerCase()}`"
      :collision-boundary="collisionBoundary"
      :collision-padding="8"
      :hide-when-detached="true"
      :prioritize-position="true"
      sticky="always"
      class="z-60 flex max-h-[var(--reka-popover-content-available-height,calc(100dvh-1rem))] w-[min(27rem,var(--reka-popover-content-available-width,calc(100vw-1rem)))] flex-col overflow-hidden p-0"
      @open-auto-focus="revealSelectedTime"
    >
      <ScrollArea class="grid min-h-0 flex-auto grid-rows-[minmax(0,1fr)] overflow-hidden" type="auto">
        <div class="grid min-w-0 min-[520px]:grid-cols-[minmax(0,1fr)_9.75rem]">
          <Calendar
            :model-value="selectedDay"
            :default-placeholder="selectedDay"
            :is-date-unavailable="(day) => day.compare(minimumDay) < 0"
            locale="vi-VN"
            :week-starts-on="0"
            class="coupon-calendar w-full [&_[data-slot=calendar-header]]:min-h-7 [&_[data-slot=calendar-grid]]:space-x-0 [&_[data-unavailable]:not([data-selected])]:text-muted-foreground [&_[data-unavailable]:not([data-selected])]:no-underline"
            @update:model-value="selectDay"
          />
          <div ref="timePanel" class="min-w-0 border-t p-3 min-[520px]:border-t-0 min-[520px]:border-l">
            <div class="mb-2 flex min-h-7 items-center gap-1.5 border-b pb-2 text-xs font-semibold">
              <Clock3 aria-hidden="true" class="size-4 text-muted-foreground" />
              Thời gian
              <span class="ml-auto rounded bg-muted px-1.5 py-1 tabular-nums">
                {{ twoDigits(draft.hour) }}:{{ twoDigits(draft.minute) }}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div v-for="list in timeLists" :key="list.field" class="min-w-0">
                <p class="mb-1 text-center text-xs text-muted-foreground">{{ list.label }}</p>
                <ScrollArea class="h-28 overflow-hidden rounded-lg border bg-muted/50 min-[520px]:h-[12.5rem]" type="auto">
                  <RadioGroupRoot
                    :model-value="draft[list.field]"
                    :aria-label="list.label"
                    orientation="vertical"
                    class="relative grid gap-0.5 p-1"
                    @update:model-value="selectTime(list.field, $event)"
                  >
                    <RadioGroupItem
                      v-for="value in list.options"
                      :key="value"
                      :value="value"
                      class="h-7 rounded text-xs tabular-nums hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[state=checked]:bg-primary data-[state=checked]:font-medium data-[state=checked]:text-primary-foreground"
                    >{{ twoDigits(value) }}</RadioGroupItem>
                  </RadioGroupRoot>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
      <div class="shrink-0 space-y-2 border-t bg-popover px-3 py-2 min-[520px]:w-[9.75rem] min-[520px]:self-end min-[520px]:border-l">
        <p v-if="draftError" role="alert" class="text-xs text-destructive">{{ draftError }}</p>
        <div class="flex items-center justify-end gap-2 min-[520px]:justify-between [&_button]:text-xs">
          <Button type="button" variant="ghost" size="sm" :disabled="disabled" @click="selectNow">Hiện tại</Button>
          <Button type="button" size="sm" :disabled="disabled" @click="confirm">Xong</Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>

<style scoped>
.coupon-calendar :deep([data-slot="calendar-grid"]) {
  display: grid;
  gap: 0.375rem;
}

.coupon-calendar :deep([data-slot="calendar-grid-body"]) {
  display: grid;
  grid-auto-rows: minmax(0, 1fr);
  height: 12.5rem;
}

.coupon-calendar :deep([data-slot="calendar-grid-body"] [data-slot="calendar-grid-row"]) {
  margin-top: 0;
}

.coupon-calendar :deep([data-slot="calendar-cell"]) {
  display: grid;
  place-items: center;
  background: transparent;
}

.coupon-calendar :deep([data-slot="calendar-cell-trigger"]) {
  width: min(100%, 2.25rem);
  height: min(calc(100% - 0.125rem), 2.25rem);
}
</style>
