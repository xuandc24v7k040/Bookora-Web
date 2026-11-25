import type { SupportMessageDto, SupportTicketDto } from '@/api/generated/models';

interface SupportTicketChanged {
  version: 1;
  ticketId: string;
  branchId: string;
  status: SupportTicketDto['status'];
  assigneeId: string | null;
  updatedAt: string;
  ticketVersion: number;
  lastSequence: number;
}

interface SupportMessageReference {
  version: 1;
  ticketId: string;
  messageId: string;
  clientMessageId: string;
  sequence: number;
  branchId: string;
  ticketVersion: number;
}

export type SupportMessageCreated = SupportMessageReference & (
  | (SupportMessageDto & { contentOmitted: false })
  | { contentOmitted: true }
);

interface SupportReadUpdated {
  version: 1;
  ticketId: string;
  userId: string;
  lastReadSequence: number;
  receipt: boolean;
  ticketVersion?: number;
}

interface SupportTyping {
  version: 1;
  ticketId: string;
  actorId: string;
  expiresAt: string;
}

declare module '@/lib/realtime/connection' {
  interface RealtimeEvents {
    'chat.ticket.changed': SupportTicketChanged;
    'chat.message.created': SupportMessageCreated;
    'chat.read.updated': SupportReadUpdated;
    'chat.typing.start': SupportTyping;
    'chat.typing.stop': SupportTyping;
  }
  interface RealtimeClientEvents {
    'chat.typing.start': { ticketId: string };
    'chat.typing.stop': { ticketId: string };
  }
}
