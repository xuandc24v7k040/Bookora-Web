<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { ChevronLeft, ChevronRight, Search } from "@lucide/vue";
import type { FlashSaleVariantDto } from "@/api/generated/models";
import { Button } from "@/components/ui/button";
import ProductVariantSelectionList, {
  type SelectionGroup,
} from "@/components/shared/ProductVariantSelectionList.vue";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { listFlashVariants } from "../api/flash-sale-api";
import { formatVnd } from "@/features/products/utils/product-money";
const props = defineProps<{
  open: boolean;
  existing: string[];
  returnFocusTo?: HTMLElement | null;
}>();
const emit = defineEmits<{
  "update:open": [value: boolean];
  add: [items: FlashSaleVariantDto[]];
}>();
const page = ref(1),
  search = ref("");
const selected = ref(new Map<string, FlashSaleVariantDto>());
const expanded = ref(new Set<string>());
const query = useQuery({
  queryKey: computed(() => ["admin-flash-variants", page.value, search.value]),
  queryFn: ({ signal }) =>
    listFlashVariants(
      { page: page.value, search: search.value || undefined },
      signal,
    ),
  enabled: computed(() => props.open),
  staleTime: 0,
});
const groups = computed<SelectionGroup[]>(() => {
  const result = new Map<string, SelectionGroup>();
  for (const item of query.data.value?.items ?? []) {
    const group = result.get(item.productId) ?? {
      productId: item.productId,
      productName: item.productName,
      thumbnailUrl: item.imageUrl,
      isSimple: item.isSimple ?? false,
      variants: [],
    };
    group.variants.push({
      id: item.variantId,
      variantName: item.variantLabel,
      sku: item.sku,
      isDefault: item.isSimple ?? false,
      currentStock: item.globalAvailableStock,
      optionSummary: `Giá gốc: ${formatVnd(item.catalogPrice)}`,
    });
    result.set(item.productId, group);
  }
  return [...result.values()];
});
watch(search, () => {
  page.value = 1;
});
watch(
  () => props.open,
  (open) => {
    if (open) {
      page.value = 1;
      search.value = "";
      selected.value = new Map();
    }
  },
);
function toggle(id: string, checked: boolean | "indeterminate") {
  const item = query.data.value?.items.find((row) => row.variantId === id);
  if (!item) return;
  if (checked === true) selected.value.set(item.variantId, item);
  else selected.value.delete(item.variantId);
}
function confirm() {
  emit("add", [...selected.value.values()]);
  emit("update:open", false);
}
function restoreFocus(event: Event) {
  if (!props.returnFocusTo?.isConnected) return;
  event.preventDefault();
  props.returnFocusTo.focus();
}
</script>
<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)"
    ><DialogContent
      class="grid h-[min(52rem,calc(100dvh-2rem))] max-h-[calc(100dvh-2rem)] grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-3xl"
      @close-auto-focus="restoreFocus"
      ><DialogHeader class="border-b p-5 pr-12 text-left"
        ><DialogTitle>Chọn sản phẩm tham gia</DialogTitle
        ><DialogDescription
          >Chọn biến thể và đối chiếu tồn kho khả dụng toàn hệ
          thống.</DialogDescription
        ></DialogHeader
      >
      <div class="mx-5 my-4 min-w-0 space-y-3">
        <div class="relative">
          <Search
            class="absolute left-3 top-3 size-4 text-muted-foreground"
          /><Input
            v-model="search"
            class="pl-9"
            placeholder="Tìm sách, biến thể hoặc SKU..."
            aria-label="Tìm biến thể"
          />
        </div>
      </div>
      <ScrollArea
        data-flash-variant-list
        class="h-full min-h-0 w-full overflow-hidden"
        ><div class="space-y-3 px-5 pb-5 pr-7">
          <p v-if="query.isPending.value" class="p-8 text-center">
            Đang tải biến thể...
          </p>
          <div v-else-if="query.isError.value" class="p-8 text-center">
            <p>Không thể tải biến thể.</p>
            <Button variant="outline" @click="query.refetch()">Thử lại</Button>
          </div>
          <template v-else
            ><ProductVariantSelectionList
              :variant-groups="groups"
              :selected-ids="new Set(selected.keys())"
              :existing-ids="existing"
              :expanded-ids="expanded"
              stock-label="Tồn toàn hệ thống"
              @toggle="toggle"
              @expand="
                (id, value) => (value ? expanded.add(id) : expanded.delete(id))
              "
            />
            <p
              v-if="!groups.length"
              class="p-8 text-center text-muted-foreground"
            >
              Không tìm thấy biến thể phù hợp.
            </p></template
          >
        </div></ScrollArea
      ><DialogFooter
        class="relative z-10 flex-col gap-3 border-t bg-background p-4 sm:flex-row sm:flex-wrap sm:items-center"
        ><div class="flex items-center gap-2 sm:mr-auto">
          <Button
            variant="outline"
            size="icon"
            aria-label="Trang trước"
            :disabled="page <= 1"
            @click="page--"
            ><ChevronLeft class="size-4" /></Button
          ><span class="text-sm" aria-live="polite"
            >Trang {{ page }} / {{ query.data.value?.totalPages || 1 }}</span
          ><Button
            variant="outline"
            size="icon"
            aria-label="Trang sau"
            :disabled="page >= (query.data.value?.totalPages || 1)"
            @click="page++"
            ><ChevronRight class="size-4"
          /></Button>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-xs text-muted-foreground" role="status"
            >Đã chọn {{ selected.size }} biến thể</span
          >
          <div class="flex gap-2">
            <Button variant="outline" @click="emit('update:open', false)"
              >Đóng</Button
            ><Button :disabled="!selected.size" @click="confirm"
              >Thêm {{ selected.size }} biến thể</Button
            >
          </div>
        </div></DialogFooter
      ></DialogContent
    ></Dialog
  >
</template>
