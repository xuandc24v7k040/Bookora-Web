<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type {
  MembershipConfigDto,
  UpdateMembershipThresholdsDto,
} from '@/api/generated/models'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { formatVnd } from '@/features/products/utils/product-money'
import {
  thresholdFields,
  thresholdInputs,
  validateThresholds,
  type ThresholdField,
  type ThresholdInputs,
} from '../membership-threshold-form'
const props = defineProps<{
  open: boolean
  config: MembershipConfigDto
  pending: boolean
  error: string
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [data: UpdateMembershipThresholdsDto]
  clearError: []
}>()
const form = reactive<ThresholdInputs>({ silver: '', gold: '', diamond: '' }),
  edited = ref(false),
  confirm = ref(false)
watch(
  () => props.open,
  (open) => {
    if (open) {
      Object.assign(form, thresholdInputs(props.config))
      edited.value = false
      confirm.value = false
    }
  },
)
const validation = computed(() =>
  validateThresholds(form, props.config.version),
)
const changed = computed(() =>
  thresholdFields.some(
    ({ key }) => validation.value.data?.[key] !== props.config[key],
  ),
)
function change(key: ThresholdField, value: string | number) {
  form[key] = String(value)
  edited.value = true
  emit('clearError')
}
function format(key: ThresholdField) {
  const value = validation.value.data?.[key]
  if (value) form[key] = new Intl.NumberFormat('vi-VN').format(value)
}
function save() {
  if (validation.value.data && !props.pending) {
    confirm.value = false
    emit('save', validation.value.data)
  }
}
</script>
<template>
  <Dialog :open="open" @update:open="!pending && emit('update:open', $event)"
    ><DialogContent
      class="membership-admin flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
    >
      <DialogHeader class="shrink-0 border-b p-5 pr-12 text-left"
        ><DialogTitle>Cấu hình ngưỡng thành viên</DialogTitle
        ><DialogDescription
          >Chỉnh cả ba ngưỡng trong một lần. Hạng đã đạt luôn được
          giữ.</DialogDescription
        ></DialogHeader
      >
      <ScrollArea class="min-h-0 flex-1 overflow-hidden"
        ><div class="space-y-5 p-5">
          <p class="rounded-lg bg-muted p-3 text-sm">
            Đồng: <strong>0đ</strong> · Cố định
          </p>
          <div v-for="field in thresholdFields" :key="field.key">
            <Label :for="`threshold-${field.key}`"
              >Ngưỡng hạng {{ field.label }} (VND)</Label
            ><Input
              :id="`threshold-${field.key}`"
              :model-value="form[field.key]"
              inputmode="numeric"
              autocomplete="off"
              class="mt-2"
              :disabled="pending"
              :aria-invalid="edited && !!validation.errors[field.key]"
              :aria-describedby="`threshold-${field.key}-error`"
              @update:model-value="change(field.key, $event)"
              @blur="format(field.key)"
            />
            <p
              v-if="edited && validation.errors[field.key]"
              :id="`threshold-${field.key}-error`"
              class="mt-1 text-xs text-destructive"
            >
              {{ validation.errors[field.key] }}
            </p>
          </div>
          <p class="text-xs leading-5 text-muted-foreground">
            Ngưỡng tăng dần: 0 &lt; Bạc &lt; Vàng &lt; Kim cương. Giảm ngưỡng sẽ
            xét nâng hạng cho thành viên đủ điều kiện.
          </p>
          <p v-if="error" role="alert" class="text-sm text-destructive">
            {{ error }}
          </p>
        </div></ScrollArea
      >
      <DialogFooter class="shrink-0 border-t p-5"
        ><Button
          variant="outline"
          class="cursor-pointer"
          :disabled="pending"
          @click="emit('update:open', false)"
          >Hủy bỏ</Button
        ><Button
          class="cursor-pointer"
          :disabled="pending || !validation.data || !changed"
          @click="confirm = true"
          >{{ pending ? 'Đang lưu...' : 'Lưu cấu hình' }}</Button
        ></DialogFooter
      >
    </DialogContent></Dialog
  >
  <AlertDialog v-model:open="confirm"
    ><AlertDialogContent
      class="membership-admin max-h-[calc(100dvh-2rem)] overflow-auto"
      ><AlertDialogHeader
        ><AlertDialogTitle>Xác nhận thay đổi ngưỡng?</AlertDialogTitle
        ><AlertDialogDescription
          >Thành viên chỉ có thể được nâng hạng. Hạng đã đạt sẽ không bị hạ khi
          tăng ngưỡng.</AlertDialogDescription
        ></AlertDialogHeader
      >
      <dl class="space-y-2 text-sm">
        <div
          v-for="field in thresholdFields"
          :key="field.key"
          class="flex flex-wrap justify-between gap-2"
        >
          <dt>{{ field.label }}</dt>
          <dd class="break-words text-right">
            {{ formatVnd(config[field.key]) }} →
            {{ formatVnd(validation.data?.[field.key]) }}
          </dd>
        </div>
      </dl>
      <AlertDialogFooter
        ><AlertDialogCancel class="cursor-pointer">Quay lại</AlertDialogCancel
        ><Button
          class="cursor-pointer"
          :disabled="pending || !validation.data"
          @click="save"
          >Xác nhận</Button
        ></AlertDialogFooter
      ></AlertDialogContent
    ></AlertDialog
  >
</template>
