import { describe, expect, it } from 'vitest';
import { SupportMessageSendBody, SupportTicketCreateBody } from '@/api/generated/zod/support/support';

describe('generated Support Unicode contract', () => {
  it('matches backend code-point limits for mixed Unicode and first/retry sends', () => {
    const message = { clientMessageId: 'unicode_contract_01', text: '📚'.repeat(4000) };
    expect(SupportMessageSendBody.safeParse(message).success).toBe(true);
    expect(SupportTicketCreateBody.safeParse({ type: 'GENERAL', message }).success).toBe(true);
    expect(SupportMessageSendBody.safeParse({ ...message, text: `${message.text}a` }).success).toBe(false);
  });
});
