import { describe, expect, it } from "vitest";
import {
  contiguousSequence,
  mergeMessages,
  type ChatMessage,
} from "./support-messages";
const message = (
  sequence: number,
  patch: Partial<ChatMessage> = {},
): ChatMessage => ({
  id: `message-${sequence}`,
  ticketId: "ticket",
  senderUserId: "customer",
  senderType: "CUSTOMER",
  senderName: "Customer",
  clientMessageId: `client-${sequence}`,
  text: "Text",
  sequence,
  createdAt: "2026-11-24T00:00:00Z",
  attachments: [],
  ...patch,
});
describe("Support canonical message reconciliation", () => {
  it("replaces an optimistic message once across HTTP then socket echoes", () => {
    const optimistic = message(0, {
      id: "local",
      clientMessageId: "client-1",
      delivery: "sending",
    });
    const committed = message(1);
    expect(
      mergeMessages(mergeMessages([optimistic], [committed]), [committed]),
    ).toEqual([committed]);
  });
  it("keeps canonical data if an old failed/pending completion arrives afterwards", () => {
    expect(
      mergeMessages(
        [message(1)],
        [
          message(0, {
            id: "local",
            clientMessageId: "client-1",
            delivery: "failed",
          }),
        ],
      ),
    ).toEqual([message(1)]);
  });
  it("keeps two principals with equal client IDs distinct and orders out-of-order sequences", () => {
    const second = message(2, {
      senderUserId: "staff",
      senderType: "BRANCH",
      clientMessageId: "client-1",
    });
    expect(mergeMessages([second], [message(1)])).toEqual([message(1), second]);
  });
  it("does not move a delta cursor past missing or pending messages", () => {
    const messages = [
      message(3),
      message(5),
      message(0, { delivery: "sending" }),
    ];
    expect(contiguousSequence(messages, 2)).toBe(3);
    expect(contiguousSequence(mergeMessages(messages, [message(4)]), 2)).toBe(
      5,
    );
  });
});
