import type { Pinia } from 'pinia';
import { useAuthStore } from '@/stores/auth.store';
import { useBranchStore } from '@/stores/branch.store';
import { queryClient } from '@/lib/query-client';
import type { RealtimeConnection } from '@/lib/realtime/connection';

interface NotificationChanged { version: 1; id?: string; branchId: string | null }
declare module '@/lib/realtime/connection' {
  interface RealtimeEvents { 'notification.changed': NotificationChanged }
}

export function installNotificationRealtime(pinia: Pinia, manager: RealtimeConnection): () => void {
  const auth = useAuthStore(pinia), branches = useBranchStore(pinia);
  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: ['notifications'] }); };
  const reset = () => {
    void queryClient.cancelQueries({ queryKey: ['notifications'] });
    queryClient.removeQueries({ queryKey: ['notifications'] });
  };
  reset();
  const stopReset = manager.onReset(reset);
  const stopReconcile = manager.onReconcile(invalidate);
  const stopEvents = manager.on('notification.changed', (event) => {
    if (event?.version !== 1) return;
    if (auth.user?.type === 'CUSTOMER' ? event.branchId !== null : event.branchId !== branches.selectedBranchId) return;
    invalidate(); // No counters derived from possibly duplicated/out-of-order socket messages.
  });
  const focus = () => { if (auth.isAuthenticated) invalidate(); };
  window.addEventListener('focus', focus);
  return () => { stopReset(); stopReconcile(); stopEvents(); window.removeEventListener('focus', focus); };
}
