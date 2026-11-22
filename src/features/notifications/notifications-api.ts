import { useMutation, useQuery } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { notificationsList, notificationsUnreadCount, notificationsRead, notificationsReadAll } from '@/api/generated/endpoints/notifications/notifications';
import type { NotificationItemDto, NotificationsListParams } from '@/api/generated/models';
import { queryClient } from '@/lib/query-client';
import { useNotificationScope } from './notification-scope';

export function useNotificationQueries(params: MaybeRefOrGetter<NotificationsListParams>) {
  const scope = useNotificationScope();
  const options = () => ({ branchScoped: false, headers: scope.branchId.value ? { 'X-Branch-Id': scope.branchId.value } : {} });
  const baseKey = computed(() => ['notifications', scope.userId.value, scope.branchId.value] as const);
  const list = useQuery({
    queryKey: computed(() => [...baseKey.value, 'list', toValue(params)]),
    queryFn: async ({ signal }) => (await notificationsList(toValue(params), options(), signal)).data,
    enabled: scope.enabled, retry: false, staleTime: 15000, refetchInterval: 60000,
    refetchOnWindowFocus: 'always',
  }, queryClient);
  const count = useQuery({
    queryKey: computed(() => [...baseKey.value, 'count']),
    queryFn: async ({ signal }) => (await notificationsUnreadCount(options(), signal)).data.count,
    enabled: scope.enabled, retry: false, staleTime: 15000, refetchInterval: 60000,
    refetchOnWindowFocus: 'always',
  }, queryClient);
  const mark = useMutation({
    mutationFn: async (id?: string) => {
      const key = baseKey.value;
      const response = id ? await notificationsRead(id, options()) : await notificationsReadAll(options());
      return { response, key };
    },
    onSuccess: ({ key }) => queryClient.invalidateQueries({ queryKey: key }),
  }, queryClient);
  // Error responses (especially revoked permissions) never retain protected rows on screen.
  const items = computed(() => scope.enabled.value && !list.isError.value ? list.data.value?.items ?? [] : []);
  const unread = computed(() => scope.enabled.value && !count.isError.value ? count.data.value ?? 0 : 0);
  const retry = () => Promise.all([list.refetch(), count.refetch()]);
  return { ...scope, list, count, mark, items, unread, retry };
}

export function notificationTarget(item: NotificationItemDto, operations: boolean): string | null {
  if (item.referenceType === 'ORDER' && /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(item.referenceId))
    return operations ? `/branch-admin/orders/${item.referenceId}` : `/account/orders/${item.referenceId}`;
  if (operations) return null;
  if (item.referenceType === 'MEMBERSHIP') return '/account/membership';
  if (item.referenceType === 'FLASH_SALE') return '/flash-sale';
  if (item.referenceType === 'COUPON') return '/san-pham?onSale=true';
  return null;
}
