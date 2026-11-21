import { watch } from 'vue';
import type { Pinia } from 'pinia';
import { queryClient } from '@/lib/query-client';
import type { RealtimeConnection } from '@/lib/realtime/connection';
import { useAuthStore } from '@/stores/auth.store';
import { useBranchStore } from '@/stores/branch.store';
import { customerOrderKeys } from '../api/customer-orders-api';
import { adminOrderKeys } from '@/features/admin-orders/api/admin-order-query-keys';
import { setupOrderSync } from './order-sync-channel';

interface OrderChanged { version: 1; orderId: string; branchId: string }
declare module '@/lib/realtime/connection' {
  interface RealtimeEvents { 'order.changed': OrderChanged }
}
const ID = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export function installOrderRealtime(pinia: Pinia, manager: RealtimeConnection): () => void {
  const auth = useAuthStore(pinia);
  const branches = useBranchStore(pinia);
  const pending = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastReconcile = 0;
  let queuedScope = '';
  const scope = () => `${auth.user?.id ?? ''}:${auth.user?.type === 'CUSTOMER' ? 'owner' : branches.selectedBranchId ?? ''}`;
  const isOrderQuery = ({ queryKey: key }: { queryKey: readonly unknown[] }) =>
    key[0] === customerOrderKeys.all[0] || key[0] === customerOrderKeys.details[0] ||
    (key[0] === 'branch-scoped' && key[2] === 'admin-orders');
  const canReadBranch = () => Boolean(branches.selectedBranchId && branches.effectivePermissions.includes('orders.read'));
  const reset = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    pending.clear();
    queuedScope = '';
    lastReconcile = 0;
    // reset() clears observed protected data as well as cancelling in-flight requests.
    for (const query of queryClient.getQueryCache().findAll({ predicate: isOrderQuery })) query.reset();
  };
  const flush = () => {
    timer = undefined;
    const ids = [...pending]; pending.clear();
    if (!auth.isAuthenticated || queuedScope !== scope()) return;
    if (auth.user?.type === 'CUSTOMER') {
      void queryClient.invalidateQueries({ queryKey: customerOrderKeys.all });
      for (const id of ids) void queryClient.invalidateQueries({ queryKey: customerOrderKeys.detail(id) });
    } else if (canReadBranch()) {
      const branchId = branches.selectedBranchId!;
      void queryClient.invalidateQueries({ queryKey: adminOrderKeys.lists(branchId) });
      for (const id of ids) void queryClient.invalidateQueries({ queryKey: adminOrderKeys.detail(branchId, id) });
    }
  };
  const queue = (orderId: string) => {
    if (!ID.test(orderId) || !auth.isAuthenticated) return;
    if (queuedScope !== scope()) pending.clear();
    queuedScope = scope();
    if (pending.size < 1024) pending.add(orderId);
    if (!timer) timer = setTimeout(flush, 30);
  };
  const reconcile = () => {
    if (!auth.isAuthenticated || Date.now() - lastReconcile < 1000) return;
    lastReconcile = Date.now();
    if (auth.user?.type === 'CUSTOMER') {
      void queryClient.invalidateQueries({ queryKey: customerOrderKeys.all });
      void queryClient.invalidateQueries({ queryKey: customerOrderKeys.details });
    } else if (canReadBranch()) {
      void queryClient.invalidateQueries({ queryKey: adminOrderKeys.scoped(branches.selectedBranchId!) });
    }
  };
  reset();
  const stopReset = manager.onReset(reset);
  const stopReconcile = manager.onReconcile(reconcile);
  const stopIdentity = watch(() => auth.user?.id, reset, { flush: 'sync' });
  const stopEvents = manager.on('order.changed', (event) => {
    if (event?.version !== 1 || typeof event.orderId !== 'string' || typeof event.branchId !== 'string' || !ID.test(event.branchId)) return;
    if (auth.user?.type !== 'CUSTOMER' && event.branchId !== branches.selectedBranchId) return;
    queue(event.orderId);
  });
  const stopLocal = setupOrderSync(async (orderId) => { queue(orderId); });
  const visible = () => { if (document.visibilityState === 'visible') reconcile(); };
  window.addEventListener('focus', reconcile);
  window.addEventListener('online', reconcile);
  document.addEventListener('visibilitychange', visible);
  return () => {
    stopEvents(); stopReset(); stopReconcile(); stopIdentity(); stopLocal();
    if (timer) clearTimeout(timer);
    pending.clear();
    window.removeEventListener('focus', reconcile);
    window.removeEventListener('online', reconcile);
    document.removeEventListener('visibilitychange', visible);
  };
}
