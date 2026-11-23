import type { Pinia } from 'pinia';
import { useAuthStore } from '@/stores/auth.store';
import { useBranchStore } from '@/stores/branch.store';
import { queryClient } from '@/lib/query-client';
import type { RealtimeConnection } from '@/lib/realtime/connection';
import { watch } from 'vue';
import { membershipCelebration } from '@/features/membership/membership-celebration';

interface NotificationChanged { version: 1; id?: string; branchId: string | null; type?: string }
declare module '@/lib/realtime/connection' {
  interface RealtimeEvents { 'notification.changed': NotificationChanged }
}

export function installNotificationRealtime(pinia: Pinia, manager: RealtimeConnection): () => void {
  const auth = useAuthStore(pinia), branches = useBranchStore(pinia);
  const invalidate = (membership = true) => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    if (membership) void queryClient.invalidateQueries({ queryKey: ['membership'] });
  };
  const reset = () => {
    membershipCelebration.reset(auth.isAuthenticated && auth.user?.type === 'CUSTOMER' ? auth.user.id : undefined);
    void queryClient.cancelQueries({ queryKey: ['notifications'] });
    queryClient.removeQueries({ queryKey: ['notifications'] });
    void queryClient.cancelQueries({ queryKey: ['membership'] });
    queryClient.removeQueries({ queryKey: ['membership'] });
  };
  reset();
  const stopAccount = watch(() => `${auth.status}:${auth.user?.id ?? ''}:${auth.user?.type ?? ''}`, reset, { flush: 'sync' });
  const stopReset = manager.onReset(reset);
  const stopReconcile = manager.onReconcile(invalidate);
  const stopEvents = manager.on('notification.changed', (event) => {
    if (event?.version !== 1) return;
    if (!auth.isAuthenticated) return;
    if (auth.user?.type === 'CUSTOMER' ? event.branchId !== null : event.branchId !== branches.selectedBranchId) return;
    invalidate(event.type === 'MEMBERSHIP_UPGRADED' || event.type === 'ORDER_COMPLETED'); // No counters derived from possibly duplicated/out-of-order socket messages.
    if (auth.user?.type === 'CUSTOMER' && event.type === 'MEMBERSHIP_UPGRADED' && typeof event.id === 'string' && event.id.length > 0)
      void membershipCelebration.receive(auth.user.id, event.id);
    if (event.type === 'COUPON_ACTIVE' && auth.user?.type === 'CUSTOMER')
      void queryClient.invalidateQueries({ queryKey: ['membership', auth.user.id, 'coupons'] });
  });
  const focus = () => { if (auth.isAuthenticated) invalidate(); };
  window.addEventListener('focus', focus);
  return () => { stopAccount(); stopReset(); stopReconcile(); stopEvents(); membershipCelebration.reset(); window.removeEventListener('focus', focus); };
}
