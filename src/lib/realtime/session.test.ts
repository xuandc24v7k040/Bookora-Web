// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { createPinia } from 'pinia';
import { installRealtimeSession } from './session';

const mocks = vi.hoisted(() => ({
  construct: vi.fn(), connect: vi.fn(), disconnect: vi.fn(),
  auth: null as unknown,
}));
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => mocks.auth }));
vi.mock('@/lib/env', () => ({ env: { apiBaseUrl: 'https://api.example.test/api/v1' } }));
vi.mock('./connection', () => ({ RealtimeConnection: class {
  constructor(...args: unknown[]) { mocks.construct(...args); }
  connect() { mocks.connect(); }
  disconnect() { mocks.disconnect(); }
} }));

function authFixture() {
  const auth = reactive({ status: 'anonymous', user: null as { id: string; type: string } | null,
    get isAuthenticated() { return this.status === 'authenticated'; }, refreshCurrentUser: vi.fn().mockResolvedValue({}) });
  mocks.auth = auth;
  return auth;
}
beforeEach(() => { vi.clearAllMocks(); });
describe('domain-independent realtime authentication session', () => {
  it('creates one connection and disconnects on logout or role/identity change', () => {
    const auth = authFixture(); const session = installRealtimeSession(createPinia());
    expect(mocks.construct).toHaveBeenCalledTimes(1); expect(mocks.connect).not.toHaveBeenCalled();
    auth.user = { id: 'customer-a', type: 'CUSTOMER' }; auth.status = 'authenticated';
    expect(mocks.connect).toHaveBeenCalledTimes(1);
    auth.user = { id: 'branch-a', type: 'BRANCH' };
    expect(mocks.construct).toHaveBeenCalledTimes(1); expect(mocks.connect).toHaveBeenCalledTimes(2);
    auth.status = 'anonymous'; const calls = mocks.connect.mock.calls.length;
    window.dispatchEvent(new Event('focus')); expect(mocks.connect).toHaveBeenCalledTimes(calls);
    session.dispose();
  });
  it('uses the existing auth refresh flow and fails closed when refresh fails', async () => {
    const auth = authFixture(); const session = installRealtimeSession(createPinia());
    const recover = mocks.construct.mock.calls[0]![2] as () => Promise<boolean>;
    expect(await recover()).toBe(true);
    auth.refreshCurrentUser.mockRejectedValueOnce(new Error('expired'));
    expect(await recover()).toBe(false); session.dispose();
  });
});
