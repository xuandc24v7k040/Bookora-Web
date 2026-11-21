// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { createPinia } from 'pinia';
import { QueryObserver } from '@tanstack/vue-query';
import type { RealtimeConnection } from '@/lib/realtime/connection';
import { queryClient } from '@/lib/query-client';
import { installOrderRealtime } from './order-realtime';

const state = vi.hoisted(() => ({ auth: null as unknown, branches: null as unknown }));
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => state.auth }));
vi.mock('@/stores/branch.store', () => ({ useBranchStore: () => state.branches }));
vi.mock('./order-sync-channel', () => ({ setupOrderSync: () => () => undefined }));
const orderId = '01M7YG1ZVVYBB2GBC3ZE27YXT6';
const branchA = '01M7YG1XWER9AMVYEK9PTQWQ2S';
const branchB = '01M7YG1XWER9AMVYEK9PTQWQ2T';

function fixture(type = 'CUSTOMER') {
  const auth = reactive({ isAuthenticated: true, user: { id: 'owner', type } });
  const branches = reactive({ selectedBranchId: branchA, effectivePermissions: ['orders.read'] });
  state.auth = auth; state.branches = branches;
  const handlers = new Map<string, (event: unknown) => void>();
  const reconcilers = new Set<() => void>(), resets = new Set<() => void>();
  const manager = {
    on: (event: string, listener: (event: unknown) => void) => { handlers.set(event, listener); return () => handlers.delete(event); },
    onReconcile: (listener: () => void) => { reconcilers.add(listener); return () => reconcilers.delete(listener); },
    onReset: (listener: () => void) => { resets.add(listener); return () => resets.delete(listener); },
  } as unknown as RealtimeConnection;
  const stop = installOrderRealtime(createPinia(), manager);
  return { auth, branches, stop, handlers, reconcilers, resets,
    emit: (value: unknown = { version: 1, orderId, branchId: branchA }) => handlers.get('order.changed')?.(value) };
}
beforeEach(() => { queryClient.clear(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); queryClient.clear(); document.body.innerHTML = ''; });

describe('Order domain cache synchronization', () => {
  it('coalesces duplicate/out-of-order hints and renders canonical REST data in an active view', async () => {
    const env = fixture();
    let canonical = 'PENDING';
    const fetchOrder = vi.fn(async () => ({ status: canonical }));
    const observer = new QueryObserver(queryClient, {
      queryKey: ['customer-order', orderId], queryFn: fetchOrder,
      initialData: { status: canonical }, staleTime: Infinity,
    });
    const unsubscribe = observer.subscribe((value) => { document.body.textContent = value.data?.status ?? ''; });
    canonical = 'SHIPPING';
    for (let i = 0; i < 100; i++) env.emit();
    await vi.advanceTimersByTimeAsync(40);
    expect(fetchOrder).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toBe('SHIPPING');
    expect(observer.getCurrentResult().data).toEqual({ status: 'SHIPPING' });
    unsubscribe(); env.stop();
  });

  it('invalidates customer lists and exact detail without unrelated domain queries', async () => {
    const env = fixture(); const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    env.emit(); await vi.advanceTimersByTimeAsync(40);
    expect(invalidate.mock.calls.map(([filter]) => (typeof filter === 'function' ? filter() : filter)?.queryKey)).toEqual([
      ['customer-orders'], ['customer-order', orderId],
    ]);
    env.stop();
  });

  it('read-only Staff refreshes only the selected branch and ignores malformed/wrong-branch hints', async () => {
    const env = fixture('BRANCH'); const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    env.emit({ version: 1, orderId, branchId: branchB });
    env.emit({ version: 2, orderId, branchId: branchA });
    env.emit({ version: 1, orderId: '../../other', branchId: branchA });
    await vi.advanceTimersByTimeAsync(40); expect(invalidate).not.toHaveBeenCalled();
    env.emit(); await vi.advanceTimersByTimeAsync(40);
    expect(invalidate.mock.calls.map(([filter]) => (typeof filter === 'function' ? filter() : filter)?.queryKey)).toEqual([
      ['branch-scoped', branchA, 'admin-orders', 'list'],
      ['branch-scoped', branchA, 'admin-orders', 'detail', orderId],
    ]);
    env.branches.effectivePermissions = []; invalidate.mockClear(); env.emit();
    await vi.advanceTimersByTimeAsync(40); expect(invalidate).not.toHaveBeenCalled(); env.stop();
  });

  it('reconnect/focus/online reconcile lists and details with bounded duplicate triggers and cleanup', async () => {
    const env = fixture(); const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    env.reconcilers.forEach((callback) => callback());
    window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('online'));
    expect(invalidate).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1100); window.dispatchEvent(new Event('focus'));
    expect(invalidate).toHaveBeenCalledTimes(4);
    env.stop(); window.dispatchEvent(new Event('focus'));
    expect(invalidate).toHaveBeenCalledTimes(4); expect(env.handlers.size).toBe(0);
  });

  it('drops queued branch-A work when the selected branch changes before the batch flush', async () => {
    const env = fixture('BRANCH'); const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    env.emit(); env.branches.selectedBranchId = branchB;
    await vi.advanceTimersByTimeAsync(40); expect(invalidate).not.toHaveBeenCalled();
    env.emit({ version: 1, orderId, branchId: branchB });
    await vi.advanceTimersByTimeAsync(40);
    expect(invalidate.mock.calls.every(([filter]) => (typeof filter === 'function' ? filter() : filter)?.queryKey?.[1] === branchB)).toBe(true);
    env.stop();
  });

  it('clears observed protected data on session reset and identity changes; cancels queued events', async () => {
    const env = fixture();
    queryClient.setQueryData(['customer-order', orderId], { status: 'SHIPPING' });
    queryClient.setQueryData(['branch-scoped', branchA, 'admin-orders', 'list'], { data: ['secret'] });
    env.emit(); env.resets.forEach((reset) => reset());
    expect(queryClient.getQueryData(['customer-order', orderId])).toBeUndefined();
    expect(queryClient.getQueryData(['branch-scoped', branchA, 'admin-orders', 'list'])).toBeUndefined();
    queryClient.setQueryData(['customer-order', orderId], { status: 'PENDING' });
    env.auth.user.id = 'other-owner';
    expect(queryClient.getQueryData(['customer-order', orderId])).toBeUndefined();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    env.auth.isAuthenticated = false; env.emit(); await vi.advanceTimersByTimeAsync(40);
    expect(invalidate).not.toHaveBeenCalled(); env.stop();
  });

  it('cancels an older refetch so a late response cannot roll canonical data back', async () => {
    const env = fixture(); let resolveOld!: (value: string) => void;
    const fetchOrder = vi.fn()
      .mockImplementationOnce(({ signal }: { signal: AbortSignal }) => new Promise<string>((resolve, reject) => {
        resolveOld = resolve; signal.addEventListener('abort', () => reject(new Error('aborted')));
      }))
      .mockResolvedValue('SHIPPING');
    const observer = new QueryObserver(queryClient, {
      queryKey: ['customer-order', orderId], queryFn: fetchOrder, initialData: 'PENDING', staleTime: Infinity,
    });
    const unsubscribe = observer.subscribe(() => undefined);
    void queryClient.invalidateQueries({ queryKey: ['customer-order', orderId] });
    await vi.advanceTimersByTimeAsync(1); env.emit(); await vi.advanceTimersByTimeAsync(40);
    resolveOld('CONFIRMED'); await vi.advanceTimersByTimeAsync(1);
    expect(observer.getCurrentResult().data).toBe('SHIPPING');
    unsubscribe(); env.stop();
  });
});
