import type { SupportMessageDto } from "@/api/generated/models";

export interface PendingMessage extends SupportMessageDto {
  delivery: "sending" | "failed";
  error?: string;
}
export type ChatMessage = SupportMessageDto & {
  delivery?: "sending" | "failed";
  error?: string;
};

/** Server identity wins over optimistic identity, including HTTP/socket arrival races. */
export function mergeMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  const messages = [...current];
  for (const next of incoming) {
    const index = messages.findIndex(
      (m) =>
        m.id === next.id ||
        (m.senderUserId === next.senderUserId &&
          m.clientMessageId === next.clientMessageId),
    );
    if (index < 0) messages.push(next);
    else if (!next.delivery || messages[index]?.delivery)
      messages[index] = next;
  }
  return messages.sort((a, b) => {
    if (a.delivery && !b.delivery) return 1;
    if (!a.delivery && b.delivery) return -1;
    return a.sequence - b.sequence || a.createdAt.localeCompare(b.createdAt);
  });
}
export function contiguousSequence(
  messages: ChatMessage[],
  start: number,
): number {
  let sequence = start;
  for (const message of messages) {
    if (message.delivery || message.sequence <= sequence) continue;
    if (message.sequence !== sequence + 1) break;
    sequence = message.sequence;
  }
  return sequence;
}
