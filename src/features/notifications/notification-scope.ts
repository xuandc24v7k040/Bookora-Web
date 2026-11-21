import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { useBranchStore } from '@/stores/branch.store';

export function hasNotificationPermissions(permissions: readonly string[]): boolean {
  return permissions.includes('orders.read') &&
    (permissions.includes('orders.update_status') || permissions.includes('orders.cancel'));
}

export function useNotificationScope() {
  const auth = useAuthStore();
  const branches = useBranchStore();
  const isCustomer = computed(() => auth.isAuthenticated && auth.user?.type === 'CUSTOMER');
  const isOperations = computed(() => auth.isAuthenticated && auth.user?.type === 'BRANCH' &&
    branches.isInitialized && Boolean(branches.selectedBranchId) &&
    hasNotificationPermissions(branches.effectivePermissions));
  const enabled = computed(() => isCustomer.value || isOperations.value);
  const branchId = computed(() => isOperations.value ? branches.selectedBranchId : null);
  const userId = computed(() => auth.user?.id ?? null);
  return { enabled, branchId, userId, isCustomer, isOperations };
}
