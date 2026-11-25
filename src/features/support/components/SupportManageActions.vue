<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useInfiniteQuery } from "@tanstack/vue-query";
import {
  Check,
  CheckCircle2,
  Hand,
  MoreHorizontal,
  UserRoundCheck,
  UsersRound,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/stores/auth.store";
import { useSupportStore } from "../state/support.store";
import { listAssignees } from "../api/support-api";
const store = useSupportStore(),
  auth = useAuthStore();
const assigning = ref(false),
  confirm = ref<"resolve" | "unclaim" | null>(null),
  assignee = ref(""),
  search = ref("");
const own = computed(
  () =>
    store.active?.assigneeId === auth.user?.id && store.can("support.reply"),
);
const manage = computed(() => store.can("support.manage"));
const candidates = useInfiniteQuery({
  queryKey: computed(() => [
    "support-chat",
    store.scope.key,
    "assignees",
    search.value,
  ]),
  initialPageParam: undefined as string | undefined,
  queryFn: ({ pageParam, signal }) =>
    listAssignees(
      store.scope,
      search.value.trim().slice(0, 160) || undefined,
      pageParam,
      signal,
    ),
  getNextPageParam: (page) => page.nextCursor ?? undefined,
  enabled: computed(() => assigning.value && manage.value && store.canUse),
  retry: false,
  staleTime: 0,
});
const people = computed(
  () => candidates.data.value?.pages.flatMap((p) => p.items) ?? [],
);
watch(
  () => [store.activeId, store.scope.key],
  () => {
    assigning.value = false;
    confirm.value = null;
  },
);
async function assign() {
  await store.action("reassign", assignee.value);
  if (!store.error) assigning.value = false;
  else await candidates.refetch();
}
async function confirmed() {
  if (!confirm.value) return;
  await store.action(confirm.value);
  if (!store.error) confirm.value = null;
}
</script>
<template>
  <div
    v-if="store.active && store.active.status !== 'RESOLVED'"
    class="flex shrink-0 flex-wrap items-center gap-1.5"
  >
    <Button
      v-if="
        store.active.status === 'OPEN' &&
        store.can('support.claim') &&
        store.can('support.reply')
      "
      size="sm"
      class="h-8 cursor-pointer text-xs"
      :disabled="store.actionLoading"
      @click="store.action('claim')"
      ><Hand class="size-3.5" />Nhận xử lý</Button
    >
    <span
      v-else-if="own"
      class="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2 py-1.5 text-[10px] font-semibold text-green-800"
      ><UserRoundCheck class="size-3.5" />Đang phụ trách</span
    >
    <Button
      v-if="own || manage"
      size="sm"
      variant="outline"
      class="h-8 cursor-pointer text-[11px]"
      :disabled="store.actionLoading"
      @click="confirm = 'resolve'"
      ><CheckCircle2 class="size-3.5" /><span class="hidden xl:inline"
        >Đánh dấu đã giải quyết</span
      ><span class="xl:hidden">Giải quyết</span></Button
    >
    <DropdownMenu v-if="own || manage"
      ><DropdownMenuTrigger as-child
        ><Button
          variant="ghost"
          size="icon"
          class="size-8 cursor-pointer"
          aria-label="Thao tác hội thoại"
          :disabled="store.actionLoading"
          ><MoreHorizontal class="size-4" /></Button></DropdownMenuTrigger
      ><DropdownMenuContent align="end">
        <DropdownMenuItem
          v-if="manage"
          class="cursor-pointer"
          @click="
            assigning = true;
            assignee = store.active?.assigneeId ?? '';
          "
          ><UsersRound class="size-4" />Phân công lại</DropdownMenuItem
        >
        <DropdownMenuItem
        v-if="manage && !own && store.can('support.reply')"
          class="cursor-pointer"
          @click="store.action('reassign', auth.user?.id)"
          ><UserRoundCheck class="size-4" />Tiếp nhận thay</DropdownMenuItem
        >
        <DropdownMenuItem
          v-if="store.active.status === 'IN_PROGRESS'"
          class="cursor-pointer"
          @click="confirm = 'unclaim'"
          >Bỏ nhận xử lý</DropdownMenuItem
        >
      </DropdownMenuContent></DropdownMenu
    >
    <Dialog v-model:open="assigning"
      ><DialogContent
        ><DialogHeader
          ><DialogTitle>Phân công hỗ trợ</DialogTitle
          ><DialogDescription
            >Nhân viên đang hoạt động, có quyền xem và trả lời hỗ trợ tại chi
            nhánh của hội thoại.</DialogDescription
          ></DialogHeader
        ><Input
          v-model="search"
          placeholder="Tìm tên nhân viên..."
          aria-label="Tìm nhân viên hỗ trợ"
          :maxlength="160"
        />
        <ScrollArea class="h-56"
          ><p
            v-if="candidates.isPending.value"
            class="p-3 text-sm text-muted-foreground"
          >
            Đang tải nhân viên...
          </p>
          <div
            v-else-if="candidates.isError.value"
            class="p-3 text-sm"
            role="alert"
          >
            Không thể tải danh sách.<Button
              variant="outline"
              class="ml-2 cursor-pointer"
              @click="candidates.refetch()"
              >Thử lại</Button
            >
          </div>
          <p
            v-else-if="!people.length"
            class="p-3 text-sm text-muted-foreground"
          >
            Không có nhân viên phù hợp.
          </p>
          <button
            v-for="person in people"
            :key="person.id"
            type="button"
            class="flex w-full cursor-pointer items-center justify-between rounded-lg p-3 text-left text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            :aria-pressed="person.id === assignee"
            @click="assignee = person.id"
          >
            {{ person.name
            }}<Check v-if="assignee === person.id" class="size-4" /></button
          ><Button
            v-if="candidates.hasNextPage.value"
            variant="ghost"
            class="w-full cursor-pointer"
            :disabled="candidates.isFetchingNextPage.value"
            @click="candidates.fetchNextPage()"
            >Xem thêm nhân viên</Button
          ></ScrollArea
        >
        <p v-if="store.error" class="text-sm text-red-700" role="alert">
          {{ store.error }}
        </p>
        <DialogFooter
          ><Button
            variant="outline"
            class="cursor-pointer"
            @click="assigning = false"
            >Đóng</Button
          ><Button
            class="cursor-pointer"
            :disabled="!assignee || store.actionLoading"
            @click="assign"
            >Xác nhận phân công</Button
          ></DialogFooter
        >
      </DialogContent></Dialog
    >
    <Dialog
      :open="!!confirm"
      @update:open="
        (value) => {
          if (!value) confirm = null;
        }
      "
      ><DialogContent
        ><DialogHeader
          ><DialogTitle>{{
            confirm === "resolve"
              ? "Đánh dấu đã giải quyết?"
              : "Bỏ nhận hội thoại?"
          }}</DialogTitle
          ><DialogDescription>{{
            confirm === "resolve"
              ? "Lịch sử được giữ lại. Khách hàng có thể chủ động tiếp tục hỗ trợ hoặc tạo yêu cầu mới."
              : "Hội thoại sẽ trở lại chờ tiếp nhận và không còn người phụ trách."
          }}</DialogDescription></DialogHeader
        ><DialogFooter
          ><Button
            variant="outline"
            class="cursor-pointer"
            :disabled="store.actionLoading"
            @click="confirm = null"
            >Quay lại</Button
          ><Button
            class="cursor-pointer"
            :disabled="store.actionLoading"
            @click="confirmed"
            >Xác nhận</Button
          ></DialogFooter
        ></DialogContent
      ></Dialog
    >
  </div>
</template>
