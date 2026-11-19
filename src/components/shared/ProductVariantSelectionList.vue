<script setup lang="ts">
import { ChevronDown } from "@lucide/vue";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
export interface SelectionVariant {
  id: string;
  variantName: string;
  sku: string | null;
  isDefault: boolean;
  optionSummary?: string | null;
  barcode?: string | null;
  currentStock: number;
}
export interface SelectionGroup {
  productId: string;
  productName: string;
  thumbnailUrl: string | null;
  isSimple: boolean;
  variants: SelectionVariant[];
}
withDefaults(
  defineProps<{
    variantGroups: SelectionGroup[];
    selectedIds: ReadonlySet<string>;
    existingIds: string[];
    expandedIds: ReadonlySet<string>;
    stockLabel?: string;
  }>(),
  { stockLabel: "Tồn hiện tại" },
);
const emit = defineEmits<{
  toggle: [id: string, checked: boolean | "indeterminate"];
  expand: [id: string, open: boolean];
}>();
function variantDisplayName(variant: SelectionVariant) {
  return variant.isDefault && !variant.variantName.trim()
    ? "Mặc định"
    : variant.variantName;
}
</script>
<template>
  <div class="space-y-3">
    <template v-for="group in variantGroups" :key="group.productId">
      <label
        v-if="group.isSimple && group.variants[0]"
        class="flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 hover:border-muted-foreground/50 hover:bg-muted/50 focus-within:border-ring focus-within:bg-muted/50 has-[[data-state=checked]]:bg-muted/50 has-[:disabled]:cursor-not-allowed"
      >
        <img
          v-if="group.thumbnailUrl"
          :src="group.thumbnailUrl"
          :alt="group.productName"
          class="size-10 shrink-0 rounded-md border object-cover"
        />
        <span class="min-w-0 flex-1">
          <span class="flex flex-wrap items-center gap-2">
            <span class="truncate font-medium" :title="group.productName">{{
              group.productName
            }}</span>
            <span
              v-if="existingIds.includes(group.variants[0]?.id ?? '')"
              class="text-xs text-muted-foreground"
              >Đã thêm</span
            >
          </span>
          <span class="block truncate font-mono text-xs text-muted-foreground"
            >SKU: {{ group.variants[0].sku }}</span
          >
          <span class="block text-xs text-muted-foreground"
            >{{ stockLabel }}:
            <span class="font-medium text-foreground">{{
              group.variants[0].currentStock
            }}</span></span
          >
        </span>
        <Checkbox
          class="ml-auto shrink-0 shadow-sm data-[state=unchecked]:border-muted-foreground/60"
          :model-value="selectedIds.has(group.variants[0].id)"
          :disabled="existingIds.includes(group.variants[0]?.id ?? '')"
          :aria-label="`Chọn ${group.productName}`"
          @update:model-value="
            (checked) => emit('toggle', group.variants[0]!.id, checked)
          "
        />
      </label>
      <Collapsible
        v-else
        :open="expandedIds.has(group.productId)"
        class="overflow-hidden rounded-lg border bg-card hover:border-muted-foreground/50 focus-within:border-ring"
        @update:open="(open) => emit('expand', group.productId, open)"
      >
        <CollapsibleTrigger
          class="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <img
            v-if="group.thumbnailUrl"
            :src="group.thumbnailUrl"
            :alt="group.productName"
            class="size-10 shrink-0 rounded-md border object-cover"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium" :title="group.productName">
              {{ group.productName }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ group.variants.length }} biến thể
            </p>
          </div>
          <ChevronDown
            class="size-4 shrink-0 transition-transform"
            :class="expandedIds.has(group.productId) ? 'rotate-180' : ''"
          />
        </CollapsibleTrigger>
        <CollapsibleContent class="border-t">
          <label
            v-for="variant in group.variants"
            :key="variant.id"
            class="flex cursor-pointer items-start gap-3 border-b p-3 last:border-b-0 hover:bg-muted/50 focus-within:bg-muted/50 has-[[data-state=checked]]:bg-muted/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
          >
            <Checkbox
              class="mt-0.5 data-[state=unchecked]:border-muted-foreground/60"
              :aria-label="`Chọn ${group.productName} — ${variantDisplayName(variant)}`"
              :model-value="selectedIds.has(variant.id)"
              :disabled="existingIds.includes(variant.id ?? '')"
              @update:model-value="
                (checked) => emit('toggle', variant.id, checked)
              "
            />
            <span class="min-w-0 flex-1 space-y-1">
              <span class="flex flex-wrap items-center gap-2">
                <span class="font-medium">{{
                  variantDisplayName(variant)
                }}</span>
                <span
                  v-if="existingIds.includes(variant.id ?? '')"
                  class="text-xs text-muted-foreground"
                  >Đã thêm</span
                >
              </span>
              <span
                v-if="variant.optionSummary"
                class="block text-sm text-muted-foreground"
                >{{ variant.optionSummary }}</span
              >
              <span
                class="block break-all font-mono text-xs text-muted-foreground"
                >SKU: {{ variant.sku }}</span
              >
              <span class="block text-xs text-muted-foreground"
                >{{ stockLabel }}:
                <span class="font-medium text-foreground">{{
                  variant.currentStock
                }}</span></span
              >
              <span
                v-if="variant.barcode"
                class="block break-all text-xs text-muted-foreground"
                >Barcode: {{ variant.barcode }}</span
              >
            </span>
          </label>
        </CollapsibleContent>
      </Collapsible>
    </template>
  </div>
</template>
