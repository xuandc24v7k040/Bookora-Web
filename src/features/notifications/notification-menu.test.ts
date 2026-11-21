import { describe, expect, it } from 'vitest';
import { resolveVisibleAdminMenu } from '@/authorization/admin-menu';
import type { PermissionPolicy } from '@/authorization/permission-policy';
import type { AdminPermission } from '@/authorization/admin-permissions';

function policy(codes: readonly string[]): PermissionPolicy {
  const permissions = new Set(codes);
  const can = (permission: AdminPermission) => permissions.has(permission);
  return { permissions, can, canAll: (required) => required.every(can),
    canAny: (required) => required.some(can) };
}
describe('notification operations navigation', () => {
  it('requires both read and an effective processing grant, never adds system navigation', () => {
    const allowed = policy(['orders.read', 'orders.cancel']);
    expect(resolveVisibleAdminMenu('BRANCH', allowed).some((item) => item.id === 'notifications')).toBe(true);
    expect(resolveVisibleAdminMenu('BRANCH', policy(['orders.read'])).some((item) => item.id === 'notifications')).toBe(false);
    expect(resolveVisibleAdminMenu('BRANCH', policy(['orders.update_status'])).some((item) => item.id === 'notifications')).toBe(false);
    expect(resolveVisibleAdminMenu('SYSTEM', allowed).some((item) => item.id === 'notifications')).toBe(false);
  });
});
