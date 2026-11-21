// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useNotificationQueries } from './notifications-api';

const api = vi.hoisted(() => ({ list: vi.fn(), count: vi.fn() }));
vi.mock('@/api/generated/endpoints/notifications/notifications', () => ({
  notificationsList: api.list, notificationsUnreadCount: api.count,
  notificationsRead: vi.fn(), notificationsReadAll: vi.fn(),
}));
vi.mock('@/lib/query-client', async () => {
  const { QueryClient } = await import('@tanstack/vue-query');
  return { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }) };
});
vi.mock('./notification-scope', () => ({ useNotificationScope: () => ({
  enabled: ref(true), userId: ref('recovery-user'), branchId: ref(null),
}) }));

it('recovers unread count together with the list after an API outage', async () => {
  api.list.mockRejectedValueOnce(new Error('controlled outage'))
    .mockResolvedValue({ data: { items: [{ id: 'persisted-row' }], totalItems: 1 } });
  api.count.mockRejectedValueOnce(new Error('controlled outage')).mockResolvedValue({ data: { count: 7 } });
  let state!: ReturnType<typeof useNotificationQueries>;
  const wrapper = mount(defineComponent({ setup() {
    state = useNotificationQueries({ page: 1, limit: 6 });
    return () => null;
  } }));
  await flushPromises();
  expect(state.list.isError.value).toBe(true);
  expect(state.count.isError.value).toBe(true);
  expect(state.items.value).toEqual([]);
  await state.retry();
  expect(state.items.value).toEqual([{ id: 'persisted-row' }]);
  expect(state.unread.value).toBe(7);
  wrapper.unmount();
});
