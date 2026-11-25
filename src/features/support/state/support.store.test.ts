// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { reactive, shallowRef, watch } from "vue";
import { flushPromises } from "@vue/test-utils";
import { queryClient } from "@/lib/query-client";
import { supportKeys } from "../api/support-api";
import type {
  SupportMessageDto,
  SupportTicketDto,
} from "@/api/generated/models";
import type {
  RealtimeConnection,
  RealtimeEvents,
} from "@/lib/realtime/connection";

const mocks = vi.hoisted(() => ({
  createTicket: vi.fn(),
  sendMessage: vi.fn(),
  getTicket: vi.fn(),
  getMessages: vi.fn(),
  getUnread: vi.fn(),
  readTicket: vi.fn(),
  ownedOrderContext: vi.fn(),
  listTickets: vi.fn(),
  changeTicket: vi.fn(),
}));
vi.mock("../api/support-api", async (original) => ({
  ...(await original<typeof import("../api/support-api")>()),
  ...mocks,
}));
const auth = reactive({
  status: "authenticated",
  isAuthenticated: true,
  user: {
    id: "01JZ0000000000000000000001",
    type: "CUSTOMER" as "CUSTOMER" | "BRANCH",
    fullName: "Fixture",
  },
  refreshCurrentUser: vi.fn(),
});
const branches = reactive({
  selectedBranchId: "01JZ0000000000000000000002",
  effectivePermissions: [] as string[],
});
vi.mock("@/stores/auth.store", () => ({ useAuthStore: () => auth }));
vi.mock("@/stores/branch.store", () => ({ useBranchStore: () => branches }));
import { useSupportStore } from "./support.store";

const id = "01JZ0000000000000000000003";
const message = (
  patch: Partial<SupportMessageDto> = {},
): SupportMessageDto => ({
  id: "01JZ0000000000000000000004",
  ticketId: id,
  senderUserId: auth.user.id,
  senderType: "CUSTOMER",
  senderName: "Fixture",
  clientMessageId: "fixture-client-id",
  text: "Hello",
  sequence: 1,
  createdAt: "2026-11-24T00:00:00Z",
  attachments: [],
  ...patch,
});
const ticket = (patch: Partial<SupportTicketDto> = {}): SupportTicketDto => ({
  id,
  customerId: auth.user.id,
  customerName: "Fixture",
  branchId: branches.selectedBranchId,
  branchName: "Branch",
  type: "GENERAL",
  orderId: null,
  orderCode: null,
  subject: null,
  status: "OPEN",
  assigneeId: null,
  assigneeName: null,
  version: 1,
  lastSequence: 1,
  lastReadSequence: 0,
  customerReadSequence: 0,
  assigneeReadSequence: 0,
  unreadCount: 0,
  createdAt: "2026-11-24T00:00:00Z",
  updatedAt: "2026-11-24T00:00:00Z",
  resolvedAt: null,
  lastMessage: message(),
  ...patch,
});
let handlers: Record<string, (event: never) => void>,
  stop: () => void,
  resetConnection: () => void,
  reconcileConnection: () => void,
  store: ReturnType<typeof useSupportStore>,
  emit: ReturnType<typeof vi.fn>;
function event<K extends keyof RealtimeEvents>(
  name: K,
  payload: RealtimeEvents[K],
) {
  handlers[name]?.(payload as never);
}
beforeEach(() => {
  vi.clearAllMocks();
  setActivePinia(createPinia());
  auth.status = "authenticated";
  auth.isAuthenticated = true;
  auth.user.type = "CUSTOMER";
  branches.selectedBranchId = "01JZ0000000000000000000002";
  branches.effectivePermissions = [];
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
  handlers = {};
  emit = vi.fn();
  mocks.getUnread.mockResolvedValue({ unreadCount: 0 });
  mocks.getTicket.mockImplementation(async () => ticket());
  mocks.getMessages.mockResolvedValue({
    items: [message()],
    nextSequence: null,
  });
  mocks.readTicket.mockImplementation(async (_scope, _id, sequence) => ({
    ticketId: id,
    lastReadSequence: sequence,
  }));
  store = useSupportStore();
  stop = store.attach({
    status: shallowRef("connected"),
    on: (name: string, cb: (e: never) => void) => {
      handlers[name] = cb;
      return () => delete handlers[name];
    },
    onReset: (callback: () => void) => {
      resetConnection = callback;
      return () => undefined;
    },
    onReconcile: (callback: () => void) => {
      reconcileConnection = callback;
      return () => undefined;
    },
    emit,
  } as unknown as RealtimeConnection);
});
afterEach(() => {
  stop();
  vi.useRealTimers();
});
describe("Support scope and real-time integration", () => {
  it("clears private data during session recovery and reloads the same navigation after authentication", async () => {
    await store.selectTicket(id);
    store.open = true;
    store.expanded = true;
    const cleanup = vi.fn();
    store.registerCleanup(cleanup);
    resetConnection();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(store.open).toBe(false);
    expect(store.activeId).toBeNull();
    expect(store.messages).toEqual([]);
    mocks.getTicket.mockClear();
    reconcileConnection();
    await flushPromises();
    expect(store.open).toBe(true);
    expect(store.expanded).toBe(true);
    expect(store.activeId).toBe(id);
    expect(mocks.getTicket).toHaveBeenCalledTimes(1);
    expect(store.messages).toHaveLength(1);
  });
  it("retries an interrupted Order contact lookup with the newly authenticated scope", async () => {
    let finishOld!: (context: {
      activeTicketId: string;
      branchId: string;
      orderCode: string;
    }) => void;
    const context = {
      activeTicketId: id,
      branchId: branches.selectedBranchId,
      orderCode: "ORDER",
    };
    mocks.ownedOrderContext.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        }),
    );
    mocks.ownedOrderContext.mockResolvedValue(context);
    const oldLookup = store.contactOrder("order");
    resetConnection();
    finishOld(context);
    await oldLookup;
    expect(store.activeId).toBeNull();
    reconcileConnection();
    await flushPromises();
    expect(mocks.ownedOrderContext).toHaveBeenCalledTimes(2);
    expect(store.activeId).toBe(id);
    expect(store.open).toBe(true);
  });
  it("does not restore navigation after effective Support access is revoked", async () => {
    auth.user.type = "BRANCH";
    branches.effectivePermissions = ["support.read"];
    await store.selectTicket(id);
    store.open = true;
    resetConnection();
    branches.effectivePermissions = [];
    mocks.getTicket.mockClear();
    reconcileConnection();
    await flushPromises();
    expect(store.open).toBe(false);
    expect(store.activeId).toBeNull();
    expect(store.canUse).toBe(false);
    expect(mocks.getTicket).not.toHaveBeenCalled();
  });
  it("publishes asynchronously loaded history through Vue reactivity", async () => {
    const lengths: Array<number | undefined> = [];
    const unwatch = watch(
      () => store.threads[id]?.messages.length,
      (length) => lengths.push(length),
    );
    await store.selectTicket(id);
    await flushPromises();
    expect(lengths).toContain(1);
    unwatch();
  });
  it("does not steal a newer draft when an earlier first-send completes late", async () => {
    let commit: (result: {
      ticketId: string;
      message: SupportMessageDto;
      replayed: boolean;
    }) => void = () => undefined;
    mocks.createTicket.mockImplementation(
      () =>
        new Promise((resolve) => {
          commit = resolve;
        }),
    );
    store.startDraft({ type: "GENERAL", branchId: branches.selectedBranchId });
    store.send("First context", []);
    const clientMessageId = store.messages[0]!.clientMessageId;
    const secondBranch = "01JZ0000000000000000000005";
    store.startDraft({ type: "GENERAL", branchId: secondBranch });
    commit({
      ticketId: id,
      message: message({ clientMessageId }),
      replayed: false,
    });
    await flushPromises();
    expect(store.draft?.branchId).toBe(secondBranch);
    expect(store.activeId).toBeNull();
    expect(store.messages).toHaveLength(0);
    expect(store.threads[id]?.messages).toHaveLength(1);
  });
  it("patches normal payloads once without full-thread or duplicate-summary fetches", async () => {
    await store.selectTicket(id);
    mocks.getMessages.mockClear();
    mocks.getTicket.mockClear();
    const incoming = {
      ...message({
        id: "reply",
        clientMessageId: "reply-client",
        sequence: 2,
        senderUserId: "staff",
        senderType: "BRANCH",
      }),
      version: 1 as const,
      messageId: "reply",
      branchId: branches.selectedBranchId,
      ticketVersion: 2,
      contentOmitted: false as const,
    };
    event("chat.message.created", incoming);
    event("chat.message.created", incoming);
    event("chat.ticket.changed", {
      version: 1,
      ticketId: id,
      branchId: branches.selectedBranchId,
      ticketVersion: 2,
      lastSequence: 2,
      status: "OPEN",
      assigneeId: null,
      updatedAt: incoming.createdAt,
    });
    await flushPromises();
    expect(store.messages).toHaveLength(2);
    expect(store.active?.unreadCount).toBe(1);
    expect(mocks.getMessages).not.toHaveBeenCalled();
    expect(mocks.getTicket).not.toHaveBeenCalled();
  });
  it("does not create an empty ticket; inserts optimistic immediately and reconciles HTTP/socket to one bubble", async () => {
    let commit: (result: {
      ticketId: string;
      message: SupportMessageDto;
      replayed: boolean;
    }) => void = () => undefined;
    mocks.createTicket.mockImplementation(
      () =>
        new Promise((resolve) => {
          commit = resolve;
        }),
    );
    store.startDraft({ type: "GENERAL", branchId: branches.selectedBranchId });
    expect(mocks.createTicket).not.toHaveBeenCalled();
    expect(store.send("Hello", [])).toBe(true);
    expect(store.messages[0]?.delivery).toBe("sending");
    const clientId = store.messages[0]!.clientMessageId;
    const canonical = message({ clientMessageId: clientId });
    event("chat.message.created", {
      ...canonical,
      version: 1,
      messageId: canonical.id,
      branchId: branches.selectedBranchId,
      ticketVersion: 1,
      contentOmitted: false,
    });
    commit({ ticketId: id, message: canonical, replayed: false });
    await flushPromises();
    expect(store.messages).toHaveLength(1);
    expect(store.messages[0]?.delivery).toBeUndefined();
    expect(store.activeId).toBe(id);
  });
  it("retains failed content and retries the same stable ID", async () => {
    mocks.createTicket
      .mockRejectedValueOnce(new Error("Timeout"))
      .mockImplementationOnce(async (_scope, payload) => ({
        ticketId: id,
        message: message({ clientMessageId: payload.message.clientMessageId }),
        replayed: true,
      }));
    store.startDraft({ type: "GENERAL", branchId: branches.selectedBranchId });
    store.send("Hello", []);
    await flushPromises();
    expect(store.messages[0]?.delivery).toBe("failed");
    const stable = store.messages[0]!.clientMessageId;
    store.retry(stable);
    await flushPromises();
    expect(mocks.createTicket.mock.calls[1]?.[1].message.clientMessageId).toBe(
      stable,
    );
    expect(store.messages).toHaveLength(1);
    expect(store.messages[0]?.delivery).toBeUndefined();
  });
  it("retains the exact persisted reply target across timeout and retry", async () => {
    await store.selectTicket(id);
    const original = store.messages[0]!;
    mocks.sendMessage.mockRejectedValueOnce(new Error("Lost ACK"));
    expect(store.send("Reply body", [], original)).toBe(true);
    expect(store.messages.at(-1)?.replyTo).toMatchObject({
      id: original.id,
      text: original.text,
    });
    await flushPromises();
    const first = mocks.sendMessage.mock.calls[0]?.[2];
    expect(first).toMatchObject({
      text: "Reply body",
      replyToMessageId: original.id,
    });
    mocks.sendMessage.mockImplementationOnce(
      async (_scope, _ticket, payload) => ({
        ticketId: id,
        replayed: true,
        message: message({
          id: "01JZ0000000000000000000009",
          clientMessageId: payload.clientMessageId,
          sequence: 2,
          text: payload.text,
          replyToMessageId: payload.replyToMessageId,
          replyTo: {
            id: original.id,
            senderName: original.senderName,
            text: original.text,
            attachmentCount: 0,
          },
        }),
      }),
    );
    store.retry(first.clientMessageId);
    await flushPromises();
    expect(mocks.sendMessage.mock.calls[1]?.[2]).toEqual(first);
    expect(store.messages).toHaveLength(2);
    expect(store.messages.at(-1)?.delivery).toBeUndefined();
    expect(store.messages.at(-1)?.replyToMessageId).toBe(original.id);
  });
  it("looks up exact resolved ORDER history and never POSTs on contact", async () => {
    mocks.ownedOrderContext.mockResolvedValue({
      activeTicketId: null,
      orderId: "order",
      orderCode: "ORDER-1",
      branchId: branches.selectedBranchId,
    });
    mocks.listTickets.mockResolvedValue({
      items: [ticket({ type: "ORDER", orderId: "order", status: "RESOLVED" })],
      nextCursor: null,
    });
    mocks.getTicket.mockResolvedValue(
      ticket({ type: "ORDER", orderId: "order", status: "RESOLVED" }),
    );
    await store.contactOrder("order");
    expect(mocks.listTickets.mock.calls[0]?.[1]).toEqual({
      orderId: "order",
      type: "ORDER",
      status: "RESOLVED",
      limit: 1,
    });
    expect(store.active?.status).toBe("RESOLVED");
    expect(store.canReply).toBe(false);
    expect(mocks.createTicket).not.toHaveBeenCalled();
  });
  it("recovers omitted content and sequence gaps through afterSequence instead of blank bubbles", async () => {
    await store.selectTicket(id);
    mocks.getMessages.mockClear();
    mocks.getMessages.mockResolvedValue({
      items: [
        message({
          id: "second",
          sequence: 2,
          clientMessageId: "second-client",
        }),
      ],
      nextSequence: null,
    });
    event("chat.message.created", {
      version: 1,
      ticketId: id,
      messageId: "second",
      clientMessageId: "second-client",
      sequence: 2,
      branchId: branches.selectedBranchId,
      ticketVersion: 2,
      contentOmitted: true,
    });
    await flushPromises();
    expect(mocks.getMessages.mock.calls[0]?.[2]).toEqual({
      afterSequence: 1,
      limit: 50,
    });
    expect(store.messages.map((m) => m.sequence)).toEqual([1, 2]);
  });
  it("does not mark hidden content read and only uses a contiguous visible watermark", async () => {
    await store.selectTicket(id);
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    await store.markRead(1);
    expect(mocks.readTicket).not.toHaveBeenCalled();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    await store.markRead(2);
    expect(mocks.readTicket).not.toHaveBeenCalled();
    await store.markRead(1);
    expect(mocks.readTicket).toHaveBeenCalledTimes(1);
  });
  it("gates staff replies by both effective capability and assignment; manager never bypasses assignee", () => {
    auth.user.type = "BRANCH";
    branches.effectivePermissions = [
      "support.read",
      "support.manage",
      "support.reply",
    ];
    store.publishTicket(
      ticket({ status: "IN_PROGRESS", assigneeId: "someone-else" }),
    );
    store.activeId = id;
    expect(store.canReply).toBe(false);
    store.publishTicket(
      ticket({ status: "IN_PROGRESS", assigneeId: auth.user.id, version: 2 }),
    );
    expect(store.canReply).toBe(true);
    branches.effectivePermissions = ["support.read"];
    expect(store.canReply).toBe(false);
    expect(store.activeId).toBeNull();
  });
  it("drops protected data/media and cancels stale completion on branch or identity changes", async () => {
    auth.user.type = "BRANCH";
    branches.effectivePermissions = ["support.read"];
    const cleanup = vi.fn();
    store.registerCleanup(cleanup);
    store.publishTicket(ticket());
    store.activeId = id;
    const old = store.scope.key;
    branches.selectedBranchId = "01JZ0000000000000000000005";
    expect(cleanup).toHaveBeenCalled();
    expect(store.scope.key).not.toBe(old);
    expect(store.activeId).toBeNull();
    expect(Object.keys(store.tickets)).toHaveLength(0);
  });
  it("patches searched inboxes for new order/message matches and retains server historical matches", () => {
    const orderKey = supportKeys.list(store.scope, { query: "p2-order" });
    const historyKey = supportKeys.list(store.scope, {
      query: "old search text",
    });
    const messageKey = supportKeys.list(store.scope, { query: "new question" });
    const resolvedKey = supportKeys.list(store.scope, {
      query: "p2-order",
      status: "RESOLVED",
    });
    const existing = ticket({
      lastMessage: message({ text: "A newer unrelated reply" }),
    });
    for (const key of [orderKey, messageKey, resolvedKey])
      queryClient.setQueryData(key, {
        pages: [{ items: [], nextCursor: null }],
        pageParams: [undefined],
      });
    queryClient.setQueryData(historyKey, {
      pages: [{ items: [existing], nextCursor: null }],
      pageParams: [undefined],
    });
    store.publishTicket(
      ticket({
        orderCode: "P2-ORDER-123",
        lastMessage: message({ text: "New question" }),
      }),
    );
    const ids = (key: readonly unknown[]) =>
      queryClient
        .getQueryData<{ pages: Array<{ items: SupportTicketDto[] }> }>(key)
        ?.pages.flatMap((page) => page.items.map((item) => item.id));
    expect(ids(orderKey)).toEqual([id]);
    expect(ids(messageKey)).toEqual([id]);
    expect(ids(historyKey)).toEqual([id]);
    expect(ids(resolvedKey)).toEqual([]);
  });
  it("throttles typing, stops on idle and never sends from an unassigned ticket", async () => {
    vi.useFakeTimers();
    store.publishTicket(ticket());
    store.activeId = id;
    store.inputTyping();
    await vi.advanceTimersByTimeAsync(250);
    expect(emit).not.toHaveBeenCalled();
    store.publishTicket(
      ticket({ status: "IN_PROGRESS", assigneeId: "staff", version: 2 }),
    );
    for (let i = 0; i < 5; i++) store.inputTyping();
    await vi.advanceTimersByTimeAsync(250);
    expect(
      emit.mock.calls.filter((c) => c[0] === "chat.typing.start"),
    ).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(emit).toHaveBeenCalledWith("chat.typing.stop", { ticketId: id });
  });
});
