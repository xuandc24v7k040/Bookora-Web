import { describe, expect, it } from 'vitest';
import { notificationGroup, notificationTime } from './notification-presentation';
import { hasNotificationPermissions } from './notification-scope';
import { notificationTarget } from './notifications-api';
import type { NotificationItemDto } from '@/api/generated/models';

describe('notification presentation and scope', () => {
  it('requires read and processing in the same branch permission set', () => {
    expect(hasNotificationPermissions(['orders.read'])).toBe(false);
    expect(hasNotificationPermissions(['orders.update_status'])).toBe(false);
    expect(hasNotificationPermissions(['orders.read', 'orders.cancel'])).toBe(true);
  });
  it('groups across midnight in Vietnam, not the browser timezone', () => {
    const now = Date.parse('2026-11-20T18:00:00Z');
    expect(notificationGroup('2026-11-20T17:00:00Z', now)).toBe('Hôm nay');
    expect(notificationGroup('2026-11-20T16:59:59Z', now)).toBe('Hôm qua');
    expect(notificationTime('2026-11-20T17:55:00Z', now)).toBe('5 phút trước');
  });
  it('routes only allowlisted reference types, never accepts an arbitrary URL', () => {
    const item = { referenceType: 'ORDER', referenceId: '01M7WK7GYHH5P29P10GJ4S6285' } as NotificationItemDto;
    expect(notificationTarget(item, false)).toBe(`/account/orders/${item.referenceId}`);
    expect(notificationTarget(item, true)).toBe(`/branch-admin/orders/${item.referenceId}`);
    expect(notificationTarget({ ...item, referenceId: 'https://evil.example' }, false)).toBeNull();
    expect(notificationTarget({ ...item, referenceType: 'COUPON' }, true)).toBeNull();
    expect(notificationTarget({ ...item, referenceType: 'FLASH_SALE' }, false)).toBe('/flash-sale');
  });
});
