import { defineStore } from "pinia";
import { toast } from "vue-sonner";
import { computed, ref, shallowRef, watch } from "vue";
import type { InfiniteData } from "@tanstack/vue-query";
import type {
  SupportMessageDto,
  SupportMessageInputDto,
  SupportTicketDto,
  SupportTicketListDto,
  SupportTicketsListParams,
} from "@/api/generated/models";
import {
  SupportMessageSendBody,
  SupportTicketCreateBody,
} from "@/api/generated/zod/support/support";
import type { RealtimeConnection } from "@/lib/realtime/connection";
import type { SupportMessageCreated } from "@/lib/realtime/support-contract";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/stores/auth.store";
import { useBranchStore } from "@/stores/branch.store";
import * as api from "../api/support-api";
import {
  contiguousSequence,
  mergeMessages,
  type ChatMessage,
} from "./support-messages";
import { isSupportAccessError, supportError } from "../support-errors";

export interface SupportDraft {
  type: "GENERAL" | "ORDER";
  branchId?: string;
  orderId?: string;
  subject?: string;
  orderCode?: string;
}
interface Thread {
  messages: ChatMessage[];
  before: number | null;
  through: number;
  loading: boolean;
  error: string;
}
interface PendingSend {
  ticketId: string | null;
  draft: SupportDraft | null;
  payload: SupportMessageInputDto;
  thread: Thread;
}
interface RecoveryIntent {
  userId: string;
  branchId: string | null;
  ticketId: string | null;
  orderId: string | null;
  expanded: boolean;
}

export const useSupportStore = defineStore("support-chat", () => {
  const auth = useAuthStore(),
    branches = useBranchStore();
  const manager = shallowRef<RealtimeConnection>();
  const generation = ref(0);
  let abort = new AbortController();
  const tickets = ref<Record<string, SupportTicketDto>>({});
  const threads = ref<Record<string, Thread>>({});
  const open = ref(false),
    expanded = ref(false),
    activeId = ref<string | null>(null);
  const draft = ref<SupportDraft | null>(null);
  const unread = ref(0),
    error = ref(""),
    contextLoading = ref(false),
    actionLoading = ref(false);
  const typing = ref<Record<string, number>>({});
  const mediaEpoch = ref(0);
  const pending = new Map<string, PendingSend>();
  const recovery = new Map<string, Promise<void>>();
  const snapshots = new Map<string, number>();
  const seen = new Set<string>();
  const cleanups = new Set<() => void>();
  let unreadTimer: ReturnType<typeof setTimeout> | undefined;
  let typingIdle: ReturnType<typeof setTimeout> | undefined;
  let typingStart: ReturnType<typeof setTimeout> | undefined;
  let typingExpiry: ReturnType<typeof setTimeout> | undefined;
  let lastTyping = 0,
    typingId: string | null = null,
    lastReconcile = 0;
  let recoveryIntent: RecoveryIntent | null = null;
  let pendingOrderId: string | null = null;

  const isCustomer = computed(() => auth.user?.type === "CUSTOMER");
  const canUse = computed(
    () =>
      auth.isAuthenticated &&
      (isCustomer.value ||
        (auth.user?.type === "BRANCH" &&
          !!branches.selectedBranchId &&
          branches.effectivePermissions.includes("support.read"))),
  );
  const scope = computed<api.SupportScope>(() => ({
    key: `${auth.user?.id ?? "guest"}:${isCustomer.value ? "owner" : (branches.selectedBranchId ?? "none")}:${generation.value}`,
    userId: auth.user?.id ?? "",
    branchId: isCustomer.value ? null : branches.selectedBranchId,
  }));
  const active = computed(() =>
    activeId.value ? tickets.value[activeId.value] : undefined,
  );
  const threadKey = computed(() => activeId.value ?? "draft");
  const messages = computed(
    () => threads.value[threadKey.value]?.messages ?? [],
  );
  const status = computed(() => manager.value?.status.value ?? "offline");
  const can = (permission: string) =>
    auth.user?.type === "BRANCH" &&
    branches.effectivePermissions.includes(permission);
  const canReply = computed(
    () =>
      canUse.value &&
      (active.value
        ? active.value.status !== "RESOLVED" &&
          (isCustomer.value ||
            (active.value.status === "IN_PROGRESS" &&
              active.value.assigneeId === auth.user?.id &&
              can("support.reply")))
        : isCustomer.value &&
          !!draft.value &&
          (draft.value.type === "ORDER"
            ? !!draft.value.orderId
            : !!draft.value.branchId)),
  );

  function ensureThread(id: string): Thread {
    if (!threads.value[id])
      threads.value[id] = {
        messages: [],
        before: null,
        through: 0,
        loading: false,
        error: "",
      };
    return threads.value[id]!;
  }
  function registerCleanup(cleanup: () => void) {
    cleanups.add(cleanup);
    return () => {
      cleanups.delete(cleanup);
    };
  }
  function reset() {
    recoveryIntent = null;
    pendingOrderId = null;
    stopTyping();
    abort.abort();
    abort = new AbortController();
    generation.value++;
    for (const cleanup of cleanups) cleanup();
    mediaEpoch.value++;
    tickets.value = {};
    threads.value = {};
    snapshots.clear();
    seen.clear();
    pending.clear();
    recovery.clear();
    activeId.value = null;
    draft.value = null;
    unread.value = 0;
    typing.value = {};
    error.value = "";
    open.value = false;
    contextLoading.value = false;
    actionLoading.value = false;
    lastReconcile = 0;
    if (unreadTimer) clearTimeout(unreadTimer);
    if (typingExpiry) clearTimeout(typingExpiry);
    for (const query of queryClient
      .getQueryCache()
      .findAll({ queryKey: api.supportKeys.all }))
      query.reset();
    queryClient.removeQueries({ queryKey: api.supportKeys.all });
  }
  function same(captured: api.SupportScope) {
    return captured.key === scope.value.key && canUse.value;
  }
  function fail(errorValue: unknown) {
    if (isSupportAccessError(errorValue)) {
      reset();
      void auth.refreshCurrentUser().catch(() => undefined);
    }
    error.value = supportError(errorValue);
  }
  function publishTicket(ticket: SupportTicketDto) {
    const previous = tickets.value[ticket.id];
    if (previous && previous.version > ticket.version) return;
    if (previous) {
      ticket = {
        ...ticket,
        lastReadSequence: Math.max(
          previous.lastReadSequence,
          ticket.lastReadSequence,
        ),
        customerReadSequence: Math.max(
          previous.customerReadSequence,
          ticket.customerReadSequence,
        ),
        assigneeReadSequence:
          previous.assigneeId === ticket.assigneeId
            ? Math.max(
                previous.assigneeReadSequence,
                ticket.assigneeReadSequence,
              )
            : ticket.assigneeReadSequence,
      };
    }
    tickets.value[ticket.id] = ticket;
    snapshots.set(
      ticket.id,
      Math.max(snapshots.get(ticket.id) ?? 0, ticket.lastSequence),
    );
    if (
      ticket.status !== "IN_PROGRESS" ||
      previous?.assigneeId !== ticket.assigneeId
    ) {
      delete typing.value[ticket.id];
      if (ticket.id === typingId) stopTyping();
    }
    // Keep server-confirmed historical text matches. Append-only messages can
    // also introduce a new match without refetching every searched list.
    for (const query of queryClient
      .getQueryCache()
      .findAll({ queryKey: api.supportKeys.scope(scope.value) })) {
      if (query.queryKey[2] !== "list") continue;
      const params = query.queryKey[3] as SupportTicketsListParams;
      const data = query.state.data as
        | InfiniteData<SupportTicketListDto>
        | undefined;
      if (!data) continue;
      const needle = params.query?.toLocaleLowerCase("vi-VN");
      const listed = data.pages.some((page) =>
        page.items.some((item) => item.id === ticket.id),
      );
      const matchesSearch =
        !needle ||
        listed ||
        [
          ticket.customerName,
          ticket.orderCode,
          ticket.subject,
          ticket.lastMessage?.text,
        ].some((value) => value?.toLocaleLowerCase("vi-VN").includes(needle));
      const matches =
        matchesSearch &&
        (!params.status || ticket.status === params.status) &&
        (!params.type || ticket.type === params.type) &&
        (!params.orderId || ticket.orderId === params.orderId);
      const pages = data.pages.map((p) => ({
        ...p,
        items: p.items.filter((t) => t.id !== ticket.id),
      }));
      if (matches && pages[0]) pages[0].items.unshift(ticket);
      queryClient.setQueryData(query.queryKey, { ...data, pages });
    }
  }
  async function loadTicket(id: string) {
    const captured = scope.value;
    try {
      const ticket = await api.getTicket(captured, id, abort.signal);
      if (same(captured)) publishTicket(ticket);
      return ticket;
    } catch (e) {
      if (same(captured)) fail(e);
      throw e;
    }
  }
  async function refreshUnread() {
    if (!canUse.value) return;
    const captured = scope.value;
    try {
      const result = await api.getUnread(captured, abort.signal);
      if (same(captured)) unread.value = result.unreadCount;
    } catch (e) {
      if (same(captured)) fail(e);
    }
  }
  function queueUnread() {
    if (unreadTimer) return;
    unreadTimer = setTimeout(() => {
      unreadTimer = undefined;
      void refreshUnread();
    }, 300);
  }
  async function loadHistory(id: string, older = false) {
    if (!canUse.value) return;
    const captured = scope.value,
      thread = ensureThread(id);
    if (thread.loading) return;
    thread.loading = true;
    thread.error = "";
    try {
      const result = await api.getMessages(
        captured,
        id,
        {
          ...(older
            ? { beforeSequence: thread.before ?? thread.messages[0]?.sequence }
            : {}),
          limit: 50,
        },
        abort.signal,
      );
      if (!same(captured)) return;
      thread.messages = mergeMessages(thread.messages, result.items);
      thread.before = result.nextSequence;
      if (!older)
        thread.through = Math.max(
          thread.through,
          result.items.at(-1)?.sequence ?? 0,
        );
    } catch (e) {
      if (same(captured)) {
        thread.error = supportError(e);
        if (isSupportAccessError(e)) fail(e);
      }
    } finally {
      thread.loading = false;
    }
  }
  async function reconcileThread(id: string): Promise<void> {
    const existing = recovery.get(id);
    if (existing) return existing;
    const captured = scope.value;
    const task = (async () => {
      const thread = threads.value[id];
      if (!thread) return;
      let cursor = thread.through;
      try {
        // Bounded pages; a subsequent recovery continues from the last committed cursor.
        for (let page = 0; page < 20; page++) {
          const result = await api.getMessages(
            captured,
            id,
            { afterSequence: cursor, limit: 50 },
            abort.signal,
          );
          if (!same(captured)) return;
          thread.messages = mergeMessages(thread.messages, result.items);
          cursor = contiguousSequence(thread.messages, cursor);
          thread.through = Math.max(thread.through, cursor);
          if (result.nextSequence === null || !result.items.length) break;
        }
        thread.error = "";
      } catch (e) {
        if (same(captured)) {
          thread.error = supportError(e);
          if (isSupportAccessError(e)) fail(e);
        }
      }
    })().finally(() => {
      if (same(captured)) recovery.delete(id);
    });
    recovery.set(id, task);
    return task;
  }
  async function selectTicket(id: string) {
    stopTyping();
    activeId.value = id;
    draft.value = null;
    error.value = "";
    const captured = scope.value;
    try {
      await loadTicket(id);
      if (!same(captured) || activeId.value !== id) return;
      if (!threads.value[id]?.messages.length) await loadHistory(id);
      else await reconcileThread(id);
    } catch {
      /* loadTicket owns safe feedback. */
    }
  }
  function startDraft(context: SupportDraft = { type: "GENERAL" }) {
    stopTyping();
    activeId.value = null;
    draft.value = { ...context };
    error.value = "";
    threads.value.draft = {
      messages: [],
      before: null,
      through: 0,
      loading: false,
      error: "",
    };
  }
  async function beginGeneral(context: SupportDraft) {
    if (!canUse.value || !isCustomer.value || !context.branchId) return;
    const captured = scope.value;
    contextLoading.value = true;
    error.value = "";
    try {
      const results = await Promise.all(
        (["OPEN", "IN_PROGRESS"] as const).map((status) =>
          api.listTickets(
            captured,
            { type: "GENERAL", branchId: context.branchId, status, limit: 1 },
            abort.signal,
          ),
        ),
      );
      if (!same(captured)) return;
      const existing = results.flatMap((result) => result.items)[0];
      if (existing) await selectTicket(existing.id);
      else startDraft(context);
    } catch (e) {
      if (same(captured)) fail(e);
    } finally {
      if (same(captured)) contextLoading.value = false;
    }
  }
  async function contactOrder(orderId: string) {
    if (!isCustomer.value || !canUse.value) return;
    pendingOrderId = orderId;
    open.value = true;
    contextLoading.value = true;
    error.value = "";
    const captured = scope.value;
    try {
      const context = await api.ownedOrderContext(orderId, abort.signal);
      if (!same(captured)) return;
      if (context.activeTicketId) {
        await selectTicket(context.activeTicketId);
        return;
      }
      const history = await api.listTickets(
        captured,
        { orderId, type: "ORDER", status: "RESOLVED", limit: 1 },
        abort.signal,
      );
      if (!same(captured)) return;
      if (history.items[0]) await selectTicket(history.items[0].id);
      else
        startDraft({
          type: "ORDER",
          orderId,
          branchId: context.branchId,
          orderCode: context.orderCode,
        });
    } catch (e) {
      if (same(captured)) fail(e);
    } finally {
      if (same(captured)) {
        contextLoading.value = false;
        if (pendingOrderId === orderId) pendingOrderId = null;
      }
    }
  }
  function acceptMessage(message: SupportMessageDto) {
    const request = pending.get(message.clientMessageId);
    if (
      request &&
      message.senderUserId === auth.user?.id &&
      !request.ticketId
    ) {
      const target = ensureThread(message.ticketId);
      target.messages = mergeMessages(target.messages, request.thread.messages);
      if (!activeId.value && threads.value.draft === request.thread) {
        delete threads.value.draft;
        activeId.value = message.ticketId;
        draft.value = null;
      }
      request.thread = target;
    }
    const thread = threads.value[message.ticketId];
    if (thread) {
      thread.messages = mergeMessages(thread.messages, [message]);
      thread.through = contiguousSequence(thread.messages, thread.through);
    }
    delete typing.value[message.ticketId];
  }
  async function performSend(id: string) {
    const request = pending.get(id);
    if (!request) return;
    const captured = scope.value;
    try {
      const result = request.ticketId
        ? await api.sendMessage(
            captured,
            request.ticketId,
            request.payload,
            abort.signal,
          )
        : await api.createTicket(
            captured,
            {
              type: request.draft!.type,
              branchId:
                request.draft!.type === "GENERAL"
                  ? request.draft!.branchId
                  : undefined,
              orderId:
                request.draft!.type === "ORDER"
                  ? request.draft!.orderId
                  : undefined,
              subject: request.draft!.subject,
              message: request.payload,
            },
            abort.signal,
          );
      if (!same(captured)) return;
      acceptMessage(result.message);
      pending.delete(id);
      if (
        !request.ticketId &&
        !result.replayed &&
        result.message.sequence === 1
      )
        toast.success("Đã tạo yêu cầu hỗ trợ");
      if (!tickets.value[result.ticketId]) await loadTicket(result.ticketId);
      if (
        !request.ticketId &&
        request.thread.through === 0 &&
        result.message.sequence > 1
      )
        await loadHistory(result.ticketId);
      queueUnread();
    } catch (e) {
      if (!same(captured)) return;
      const thread = request.thread;
      const message = thread?.messages.find((m) => m.clientMessageId === id);
      if (message && !message.delivery) {
        pending.delete(id);
        return;
      } // Socket committed before HTTP timed out.
      if (message) {
        message.delivery = "failed";
        message.error = supportError(e);
      }
      if (isSupportAccessError(e)) fail(e);
      else if (request.ticketId)
        void loadTicket(request.ticketId).catch(() => undefined);
    }
  }
  function send(
    text: string,
    attachments: SupportMessageDto["attachments"],
    replyTo?: SupportMessageDto,
  ): boolean {
    if (!canReply.value || messages.value.some((m) => m.delivery === "sending"))
      return false;
    const payload: SupportMessageInputDto = {
      clientMessageId: crypto.randomUUID(),
      ...(text.trim() ? { text: text.trim() } : {}),
      attachmentIds: attachments.map((a) => a.id),
      ...(activeId.value && replyTo ? { replyToMessageId: replyTo.id } : {}),
    };
    if (
      (!payload.text && !attachments.length) ||
      !SupportMessageSendBody.safeParse(payload).success
    ) {
      error.value = "Nhập nội dung tối đa 4.000 ký tự hoặc chọn tối đa 5 tệp.";
      return false;
    }
    const context = draft.value ? { ...draft.value } : null;
    if (
      !activeId.value &&
      !SupportTicketCreateBody.safeParse({
        type: context?.type,
        branchId: context?.type === "GENERAL" ? context.branchId : undefined,
        orderId: context?.type === "ORDER" ? context.orderId : undefined,
        subject: context?.subject,
        message: payload,
      }).success
    ) {
      error.value = "Vui lòng kiểm tra chi nhánh và chủ đề.";
      return false;
    }
    const id = payload.clientMessageId;
    const thread = ensureThread(threadKey.value);
    pending.set(id, {
      ticketId: activeId.value,
      draft: context,
      payload,
      thread,
    });
    thread.messages.push({
      id,
      ticketId: activeId.value ?? "draft",
      clientMessageId: id,
      senderUserId: auth.user!.id,
      senderType: auth.user!.type,
      senderName: auth.user!.fullName ?? "",
      text: payload.text ?? null,
      sequence: 0,
      createdAt: new Date().toISOString(),
      attachments,
      replyToMessageId: payload.replyToMessageId ?? null,
      replyTo: replyTo
        ? {
            id: replyTo.id,
            senderName: replyTo.senderName,
            text: replyTo.text
              ? Array.from(replyTo.text).slice(0, 240).join("")
              : null,
            attachmentCount: replyTo.attachments.length,
          }
        : null,
      delivery: "sending",
    });
    stopTyping();
    error.value = "";
    void performSend(id);
    return true;
  }
  function retry(id: string) {
    const message = messages.value.find((m) => m.clientMessageId === id);
    if (!message || message.delivery !== "failed" || !canReply.value) return;
    message.delivery = "sending";
    message.error = undefined;
    void performSend(id);
  }
  async function action(actionName: api.SupportAction, assigneeId?: string) {
    if (!activeId.value || actionLoading.value) return;
    const captured = scope.value,
      id = activeId.value;
    actionLoading.value = true;
    error.value = "";
    stopTyping();
    try {
      const ticket = await api.changeTicket(
        captured,
        id,
        actionName,
        assigneeId,
        abort.signal,
      );
      if (!same(captured)) return;
      publishTicket(ticket);
      if (ticket.id !== id) await selectTicket(ticket.id);
    } catch (e) {
      if (same(captured)) {
        error.value = supportError(e);
        if (isSupportAccessError(e)) fail(e);
        else await loadTicket(id).catch(() => undefined);
      }
    } finally {
      if (same(captured)) actionLoading.value = false;
    }
  }
  async function markRead(sequence: number) {
    const ticket = active.value;
    if (
      !canUse.value ||
      !ticket ||
      document.visibilityState !== "visible" ||
      sequence > (threads.value[ticket.id]?.through ?? 0)
    )
      return;
    if (
      sequence <= ticket.lastReadSequence &&
      (ticket.assigneeId !== auth.user?.id ||
        sequence <= ticket.assigneeReadSequence)
    )
      return;
    const captured = scope.value;
    try {
      const result = await api.readTicket(
        captured,
        ticket.id,
        sequence,
        abort.signal,
      );
      if (!same(captured)) return;
      ticket.lastReadSequence = Math.max(
        ticket.lastReadSequence,
        result.lastReadSequence,
      );
      if (isCustomer.value)
        ticket.customerReadSequence = Math.max(
          ticket.customerReadSequence,
          sequence,
        );
      else if (ticket.assigneeId === auth.user?.id)
        ticket.assigneeReadSequence = Math.max(
          ticket.assigneeReadSequence,
          sequence,
        );
      if (sequence >= ticket.lastSequence) ticket.unreadCount = 0;
      queueUnread();
    } catch (e) {
      if (same(captured) && isSupportAccessError(e)) fail(e);
    }
  }
  function stopTyping() {
    if (typingStart) clearTimeout(typingStart);
    if (typingIdle) clearTimeout(typingIdle);
    if (typingId)
      manager.value?.emit("chat.typing.stop", { ticketId: typingId });
    typingStart = undefined;
    typingIdle = undefined;
    typingId = null;
    lastTyping = 0;
  }
  function inputTyping() {
    if (
      !active.value ||
      active.value.status !== "IN_PROGRESS" ||
      !canReply.value
    )
      return;
    const id = active.value.id;
    if (!typingStart && Date.now() - lastTyping >= 1000)
      typingStart = setTimeout(() => {
        typingStart = undefined;
        if (!canReply.value || activeId.value !== id) return;
        manager.value?.emit("chat.typing.start", { ticketId: id });
        typingId = id;
        lastTyping = Date.now();
      }, 200);
    if (typingIdle) clearTimeout(typingIdle);
    typingIdle = setTimeout(stopTyping, 2000);
  }
  function onMessage(event: SupportMessageCreated) {
    if (
      !canUse.value ||
      event.version !== 1 ||
      (!isCustomer.value && event.branchId !== scope.value.branchId)
    )
      return;
    const ticket = tickets.value[event.ticketId];
    if (isCustomer.value && ticket && ticket.customerId !== auth.user?.id)
      return;
    const thread = threads.value[event.ticketId];
    if (event.contentOmitted) {
      if (thread) void reconcileThread(event.ticketId);
      void loadTicket(event.ticketId).catch(() => undefined);
      queueUnread();
      return;
    }
    if (seen.has(event.messageId)) return;
    seen.add(event.messageId);
    if (seen.size > 4096) seen.delete(seen.values().next().value!);
    const gap = thread && event.sequence > thread.through + 1;
    acceptMessage(event);
    if (ticket) {
      if (
        event.sequence > (snapshots.get(ticket.id) ?? 0) &&
        event.senderType === (isCustomer.value ? "BRANCH" : "CUSTOMER") &&
        event.sequence > ticket.lastReadSequence
      ) {
        ticket.unreadCount++;
        unread.value++;
      }
      if (!ticket.lastMessage || event.sequence > ticket.lastMessage.sequence) {
        ticket.lastMessage = event;
        ticket.updatedAt = event.createdAt;
      }
      ticket.lastSequence = Math.max(ticket.lastSequence, event.sequence);
      ticket.version = Math.max(ticket.version, event.ticketVersion);
      // Keep list references current without fetching the complete thread.
      const snapshot = snapshots.get(ticket.id) ?? 0;
      publishTicket({ ...ticket });
      snapshots.set(ticket.id, snapshot);
    } else {
      void loadTicket(event.ticketId).catch(() => undefined);
      queueUnread();
    }
    if (gap) void reconcileThread(event.ticketId);
  }
  function reconcile() {
    if (!canUse.value) return;
    let restoringSelection = false;
    // Session recovery clears protected data immediately. Restore only navigation
    // intent after the shared socket has authenticated again in the same scope.
    if (recoveryIntent && manager.value?.status.value === "connected") {
      const intent = recoveryIntent;
      recoveryIntent = null;
      if (
        intent.userId === scope.value.userId &&
        intent.branchId === scope.value.branchId
      ) {
        expanded.value = intent.expanded;
        open.value = true;
        restoringSelection = true;
        if (intent.orderId) void contactOrder(intent.orderId);
        else if (intent.ticketId) void selectTicket(intent.ticketId);
      }
    }
    if (Date.now() - lastReconcile < 1000) return;
    lastReconcile = Date.now();
    typing.value = {};
    void refreshUnread();
    void queryClient.invalidateQueries({
      queryKey: api.supportKeys.scope(scope.value),
      predicate: (q) => q.queryKey[2] === "list",
    });
    if (activeId.value && !restoringSelection) {
      void loadTicket(activeId.value).catch(() => undefined);
      void reconcileThread(activeId.value);
    }
  }
  function scheduleTypingExpiry() {
    if (typingExpiry) clearTimeout(typingExpiry);
    const now = Date.now();
    for (const [id, until] of Object.entries(typing.value))
      if (!Number.isFinite(until) || until <= now) delete typing.value[id];
    const next = Math.min(...Object.values(typing.value));
    if (Number.isFinite(next))
      typingExpiry = setTimeout(scheduleTypingExpiry, Math.max(1, next - now));
  }
  function attach(connection: RealtimeConnection): () => void {
    manager.value = connection;
    const stops = [
      connection.on("chat.message.created", onMessage),
      connection.on("chat.ticket.changed", (event) => {
        if (
          !canUse.value ||
          event.version !== 1 ||
          (!isCustomer.value && event.branchId !== scope.value.branchId)
        )
          return;
        const ticket = tickets.value[event.ticketId];
        if (ticket && ticket.version > event.ticketVersion) return;
        if (
          ticket &&
          ticket.version === event.ticketVersion &&
          ticket.status === event.status &&
          ticket.assigneeId === event.assigneeId &&
          ticket.lastSequence >= event.lastSequence
        )
          return;
        if (ticket) {
          const changedAssignee = ticket.assigneeId !== event.assigneeId;
          Object.assign(ticket, {
            status: event.status,
            assigneeId: event.assigneeId,
            version: event.ticketVersion,
            lastSequence: Math.max(ticket.lastSequence, event.lastSequence),
            updatedAt: event.updatedAt,
          });
          if (changedAssignee) {
            ticket.assigneeReadSequence = 0;
            ticket.assigneeName = null;
          }
          if (changedAssignee || event.status !== "IN_PROGRESS") {
            delete typing.value[event.ticketId];
            if (event.ticketId === typingId) stopTyping();
          }
        }
        // Summary is deliberately omitted from the frozen ticket event; hydrate once by version.
        void loadTicket(event.ticketId).catch(() => undefined);
      }),
      connection.on("chat.read.updated", (event) => {
        const ticket = tickets.value[event.ticketId];
        if (!canUse.value || event.version !== 1 || !ticket) return;
        if (event.userId === auth.user?.id) {
          ticket.lastReadSequence = Math.max(
            ticket.lastReadSequence,
            event.lastReadSequence,
          );
          if (ticket.lastReadSequence >= ticket.lastSequence)
            ticket.unreadCount = 0;
          queueUnread();
        }
        if (
          !event.receipt ||
          (event.ticketVersion !== undefined &&
            event.ticketVersion < ticket.version)
        )
          return;
        if (event.userId === ticket.customerId)
          ticket.customerReadSequence = Math.max(
            ticket.customerReadSequence,
            event.lastReadSequence,
          );
        else if (event.userId === ticket.assigneeId)
          ticket.assigneeReadSequence = Math.max(
            ticket.assigneeReadSequence,
            event.lastReadSequence,
          );
        if (event.ticketVersion !== undefined)
          ticket.version = Math.max(ticket.version, event.ticketVersion);
      }),
      connection.on("chat.typing.start", (event) => {
        const ticket = tickets.value[event.ticketId];
        if (
          !canUse.value ||
          event.version !== 1 ||
          !ticket ||
          ticket.status !== "IN_PROGRESS" ||
          event.actorId !==
            (isCustomer.value ? ticket.assigneeId : ticket.customerId) ||
          (!isCustomer.value && ticket.assigneeId !== auth.user?.id)
        )
          return;
        typing.value[event.ticketId] = Math.min(
          Date.parse(event.expiresAt),
          Date.now() + 3500,
        );
        scheduleTypingExpiry();
      }),
      connection.on("chat.typing.stop", (event) => {
        if (event.version === 1) delete typing.value[event.ticketId];
      }),
      connection.onReconcile(reconcile),
      connection.onReset(() => {
        const intent: RecoveryIntent | null =
          canUse.value && open.value
            ? {
                userId: scope.value.userId,
                branchId: scope.value.branchId,
                ticketId: pendingOrderId ? null : activeId.value,
                orderId: pendingOrderId,
                expanded: expanded.value,
              }
            : null;
        reset();
        recoveryIntent = intent;
      }),
      watch(
        () =>
          `${auth.status}:${auth.user?.id ?? ""}:${auth.user?.type ?? ""}:${isCustomer.value ? "" : branches.selectedBranchId}:${isCustomer.value ? "" : branches.effectivePermissions.join(",")}`,
        () => {
          reset();
          if (canUse.value) reconcile();
        },
        { flush: "sync", immediate: true },
      ),
    ];
    const visible = () => {
      if (document.visibilityState === "visible") reconcile();
      else stopTyping();
    };
    const offline = () => {
      stopTyping();
      typing.value = {};
    };
    window.addEventListener("focus", reconcile);
    window.addEventListener("online", reconcile);
    window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", visible);
    return () => {
      stops.forEach((stop) => stop());
      reset();
      manager.value = undefined;
      window.removeEventListener("focus", reconcile);
      window.removeEventListener("online", reconcile);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", visible);
    };
  }
  return {
    tickets,
    threads,
    open,
    expanded,
    activeId,
    active,
    draft,
    unread,
    error,
    contextLoading,
    actionLoading,
    isCustomer,
    canUse,
    canReply,
    scope,
    status,
    messages,
    threadKey,
    typing,
    mediaEpoch,
    can,
    selectTicket,
    startDraft,
    contactOrder,
    beginGeneral,
    send,
    retry,
    action,
    markRead,
    loadHistory,
    loadTicket,
    publishTicket,
    reconcile,
    reconcileThread,
    stopTyping,
    inputTyping,
    attach,
    registerCleanup,
    fail,
  };
});
