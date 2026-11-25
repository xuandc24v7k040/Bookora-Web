<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type Database from "emoji-picker-element/database";
import type { Emoji, NativeEmoji, SkinTone } from "emoji-picker-element/shared";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

const emit = defineEmits<{ select: [value: string] }>();
const categories = [
  { id: 0, icon: "😀", label: "Cảm xúc" },
  { id: 1, icon: "👋", label: "Người" },
  { id: 3, icon: "🐱", label: "Động vật và thiên nhiên" },
  { id: 4, icon: "🍎", label: "Đồ ăn" },
  { id: 5, icon: "🏠", label: "Du lịch" },
  { id: 6, icon: "⚽", label: "Hoạt động" },
  { id: 7, icon: "📝", label: "Đồ vật" },
  { id: 8, icon: "⛔", label: "Ký hiệu" },
  { id: 9, icon: "🏁", label: "Cờ" },
] as const;
const tones = [
  { icon: "🖐️", label: "Mặc định" },
  { icon: "🖐🏻", label: "Sáng" },
  { icon: "🖐🏼", label: "Trung bình sáng" },
  { icon: "🖐🏽", label: "Trung bình" },
  { icon: "🖐🏾", label: "Trung bình tối" },
  { icon: "🖐🏿", label: "Tối" },
] as const;
const query = ref("");
const category = ref<number>(0);
const skinTone = ref("0");
const emojis = ref<NativeEmoji[]>([]);
const favorites = ref<NativeEmoji[]>([]);
const loading = ref(true);
const error = ref(false);
const focusedIndex = ref(0);
const grid = ref<HTMLElement>();
const ready = ref(false);
let database: Database | undefined;
let disposed = false;
let request = 0;
const label = computed(() =>
  query.value.trim()
    ? "Kết quả tìm kiếm"
    : (categories.find((item) => item.id === category.value)?.label ??
      "Biểu tượng"),
);
function native(emoji: Emoji): emoji is NativeEmoji {
  return "unicode" in emoji;
}
function unicode(emoji: NativeEmoji): string {
  return (
    emoji.skins?.find((skin) => skin.tone === Number(skinTone.value))
      ?.unicode ?? emoji.unicode
  );
}
async function load() {
  if (!database) return;
  const current = ++request;
  loading.value = true;
  error.value = false;
  try {
    const result = query.value.trim()
      ? await database.getEmojiBySearchQuery(query.value.trim())
      : await database.getEmojiByGroup(category.value);
    if (disposed || current !== request) return;
    emojis.value = result.filter(native);
    focusedIndex.value = 0;
  } catch {
    if (!disposed && current === request) error.value = true;
  } finally {
    if (!disposed && current === request) loading.value = false;
  }
}
function choose(emoji: NativeEmoji) {
  emit("select", unicode(emoji));
  void database
    ?.incrementFavoriteEmojiCount(emoji.unicode)
    .catch(() => undefined);
}
function selectCategory(id: number) {
  category.value = id;
  query.value = "";
}
function gridKeydown(event: KeyboardEvent) {
  const offsets: Record<string, number> = {
    ArrowRight: 1,
    ArrowLeft: -1,
    ArrowDown: 8,
    ArrowUp: -8,
  };
  if (!(event.key in offsets) && event.key !== "Home" && event.key !== "End")
    return;
  event.preventDefault();
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? emojis.value.length - 1
        : Math.max(
            0,
            Math.min(
              emojis.value.length - 1,
              focusedIndex.value + offsets[event.key]!,
            ),
          );
  focusedIndex.value = next;
  grid.value?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
}
function categoryKeydown(event: KeyboardEvent) {
  const buttons = Array.from(
    (event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    ),
  );
  const index = buttons.indexOf(event.target as HTMLButtonElement);
  if (
    index < 0 ||
    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
  )
    return;
  event.preventDefault();
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? buttons.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) %
          buttons.length;
  buttons[next]?.focus();
  buttons[next]?.click();
}
watch([query, category], () => {
  if (ready.value) void load();
});
watch(skinTone, (tone) => {
  void database
    ?.setPreferredSkinTone(Number(tone) as SkinTone)
    .catch(() => undefined);
});
onMounted(async () => {
  try {
    const { default: EmojiDatabase } =
      await import("emoji-picker-element/database");
    if (disposed) return;
    database = new EmojiDatabase({
      locale: "vi",
      dataSource: `${import.meta.env.BASE_URL}emoji/vi.json`,
    });
    await database.ready();
    const [recent, tone] = await Promise.all([
      database.getTopFavoriteEmoji(8),
      database.getPreferredSkinTone(),
    ]);
    if (disposed) return;
    favorites.value = recent.filter(native);
    skinTone.value = String(tone);
    ready.value = true;
    await load();
  } catch {
    if (!disposed) {
      error.value = true;
      loading.value = false;
    }
  }
});
onBeforeUnmount(() => {
  disposed = true;
  request++;
});
</script>
<template>
  <section
    class="support-emoji-picker flex min-h-0 flex-col p-2"
    aria-label="Kho biểu tượng cảm xúc"
  >
    <div class="mb-1 flex shrink-0 items-center gap-1">
      <Input
        v-model="query"
        aria-label="Tìm biểu tượng"
        placeholder="Tìm biểu tượng"
        class="h-9 min-w-0 flex-1 text-sm"
        @keydown.down.prevent="
          grid?.querySelector<HTMLButtonElement>('button')?.focus()
        "
      />
      <Select v-model="skinTone">
        <SelectTrigger
          class="h-9 w-12 shrink-0 cursor-pointer border-0 px-1 shadow-none"
          aria-label="Chọn màu da"
          >{{ tones[Number(skinTone)]?.icon }}</SelectTrigger
        >
        <SelectContent class="z-[90]">
          <SelectItem
            v-for="(tone, index) in tones"
            :key="index"
            :value="String(index)"
            >{{ tone.icon }} {{ tone.label }}</SelectItem
          >
        </SelectContent>
      </Select>
    </div>
    <div
      class="grid shrink-0 grid-cols-9 border-b"
      role="tablist"
      aria-label="Nhóm biểu tượng"
      @keydown="categoryKeydown"
    >
      <button
        v-for="item in categories"
        :key="item.id"
        type="button"
        role="tab"
        :aria-label="item.label"
        :title="item.label"
        :aria-selected="!query.trim() && category === item.id"
        :tabindex="category === item.id ? 0 : -1"
        class="support-emoji-category cursor-pointer border-b-2 border-transparent bg-transparent py-2 text-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="selectCategory(item.id)"
      >
        {{ item.icon }}
      </button>
    </div>
    <ScrollArea
      :key="`${category}:${query}`"
      class="support-emoji-scroll mt-1 min-h-0 flex-1"
      aria-label="Danh sách biểu tượng"
    >
      <p v-if="loading" role="status" class="p-3 text-sm text-muted-foreground">
        Đang tải biểu tượng…
      </p>
      <p v-else-if="error" role="alert" class="p-3 text-sm">
        Không tải được emoji. Hãy đóng và mở lại.
      </p>
      <template v-else>
        <p class="px-1 py-1 text-xs text-muted-foreground">{{ label }}</p>
        <div
          ref="grid"
          class="grid grid-cols-8 gap-0.5 pr-2"
          role="listbox"
          :aria-label="label"
          @keydown="gridKeydown"
        >
          <button
            v-for="(emoji, index) in emojis"
            :key="emoji.unicode"
            type="button"
            role="option"
            :aria-label="emoji.annotation"
            :title="emoji.annotation"
            :aria-selected="focusedIndex === index"
            :tabindex="focusedIndex === index ? 0 : -1"
            class="min-w-0 cursor-pointer rounded-md bg-transparent py-1.5 text-2xl hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @focus="focusedIndex = index"
            @click="choose(emoji)"
          >
            {{ unicode(emoji) }}
          </button>
        </div>
        <p
          v-if="!emojis.length"
          role="status"
          class="p-3 text-sm text-muted-foreground"
        >
          Không tìm thấy biểu tượng.
        </p>
      </template>
    </ScrollArea>
    <div
      v-if="favorites.length"
      class="mt-1 grid shrink-0 grid-cols-8 border-t pt-1"
      role="group"
      aria-label="Thường dùng"
    >
      <button
        v-for="emoji in favorites"
        :key="emoji.unicode"
        type="button"
        :aria-label="emoji.annotation"
        :title="emoji.annotation"
        class="cursor-pointer rounded-md p-1 text-2xl hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="choose(emoji)"
      >
        {{ unicode(emoji) }}
      </button>
    </div>
  </section>
</template>
