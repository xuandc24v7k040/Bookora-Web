<script setup lang="ts">
import type { SupportTicketDto } from "@/api/generated/models";
import { Badge } from "@/components/ui/badge";
defineProps<{ status: SupportTicketDto["status"]; customer?: boolean }>();
</script>
<template>
  <Badge
    variant="secondary"
    class="shrink-0 whitespace-nowrap text-[10px] font-semibold"
    :class="
      status === 'OPEN'
        ? 'bg-amber-50 text-amber-800'
        : status === 'IN_PROGRESS'
          ? 'bg-green-50 text-green-800'
          : 'bg-slate-100 text-slate-600'
    "
  >
    {{
      status === "OPEN"
        ? "Chờ tiếp nhận"
        : status === "IN_PROGRESS"
          ? customer
            ? "Đang hỗ trợ"
            : "Đang xử lý"
          : "Đã giải quyết"
    }}
  </Badge>
</template>
