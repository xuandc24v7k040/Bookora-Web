<script setup lang="ts">
import "@/features/flash-sales/flash-sale.css";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
defineProps<{
  open: boolean;
  allowed: number;
  requested: number;
  pending: boolean;
}>();
const emit = defineEmits<{ reduce: []; regular: []; cancel: [] }>();
</script>
<template>
  <AlertDialog
    :open="open"
    @update:open="
      (value) => {
        if (!value && !pending) emit('cancel');
      }
    "
    ><AlertDialogContent
      ><AlertDialogHeader
        ><AlertDialogTitle>Chọn cách mua sản phẩm</AlertDialogTitle
        ><AlertDialogDescription
          >Bạn yêu cầu {{ requested }} sản phẩm nhưng chỉ còn được hưởng
          {{ allowed }} suất Flash Sale. Giá, voucher và phí vận chuyển sẽ được
          tính lại để bạn kiểm tra trước khi đặt đơn.</AlertDialogDescription
        ></AlertDialogHeader
      ><AlertDialogFooter class="flex-col gap-2 sm:flex-col"
        ><Button v-if="allowed > 0" :disabled="pending" @click="emit('reduce')"
          >Mua {{ allowed }} sản phẩm Flash Sale</Button
        ><Button variant="outline" :disabled="pending" @click="emit('regular')"
          >Mua toàn bộ {{ requested }} sản phẩm giá thường</Button
        ><Button variant="ghost" :disabled="pending" @click="emit('cancel')"
          >Quay lại giỏ hàng</Button
        ></AlertDialogFooter
      ></AlertDialogContent
    ></AlertDialog
  >
</template>
