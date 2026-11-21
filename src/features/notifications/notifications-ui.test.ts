// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import NotificationBell from './components/NotificationBell.vue';
import CustomerNotificationCenter from './components/CustomerNotificationCenter.vue';

const mocks = vi.hoisted(() => ({ queries: vi.fn() }));
vi.mock('./notifications-api', () => ({ useNotificationQueries: mocks.queries, notificationTarget: () => '/account/orders/test' }));
function state(operations = false) {
  const items = ref(Array.from({ length: 5 }, (_, n) => ({ id: String(n), title: `Đơn hàng ${n}`,
    content: 'Nội dung thật từ API kiểm thử', type: 'ORDER_CONFIRMED', category: 'ORDER',
    readAt: null, createdAt: new Date().toISOString(), referenceType: 'ORDER', referenceId: 'test', branchId: null })));
  return { isCustomer: ref(!operations), isOperations: ref(operations), enabled: ref(true),
    branchId: ref(operations ? 'branch-a' : null), items, unread: ref(120),
    list: { data: computed(() => ({ items: items.value, page: 1, totalPages: 2, totalItems: 8 })),
      isPending: ref(false), isFetching: ref(false), isError: ref(false), refetch: vi.fn() },
    mark: { isPending: ref(false), mutateAsync: vi.fn().mockResolvedValue({ count: 1 }) } };
}
function router() { return createRouter({ history: createMemoryHistory(), routes: [
  { path: '/', component: { template: '<div />' } },
  { path: '/account/notifications', component: { template: '<div />' } },
  { path: '/account/orders/test', component: { template: '<div />' } },
] }); }
beforeEach(() => { vi.clearAllMocks(); document.body.innerHTML = ''; });

describe('notification UI', () => {
  it('clamps badge at 99+, renders five rows and opens all notifications', async () => {
    const data = state(); mocks.queries.mockReturnValue(data);
    const routes = router(); await routes.push('/');
    const wrapper = mount(NotificationBell, { attachTo: document.body, global: { plugins: [routes] } });
    expect(wrapper.text()).toContain('99+');
    await wrapper.get('button').trigger('click'); await flushPromises();
    expect(document.body.querySelectorAll('.notification-row')).toHaveLength(5);
    const footer = [...document.body.querySelectorAll('button')].find((button) => button.textContent?.includes('Xem tất cả'))!;
    footer.click(); await flushPromises();
    expect(routes.currentRoute.value.path).toBe('/account/notifications'); wrapper.unmount();
  });
  it('does not show customer bell to a non-customer and hides zero badge', () => {
    const data = state(true); mocks.queries.mockReturnValue(data);
    const wrapper = mount(NotificationBell, { global: { plugins: [router()] } });
    expect(wrapper.find('button').exists()).toBe(false); wrapper.unmount();
    const customer = state(); customer.unread.value = 0; mocks.queries.mockReturnValue(customer);
    const zero = mount(NotificationBell, { global: { plugins: [router()] } });
    expect(zero.find('.bg-red-600').exists()).toBe(false); zero.unmount();
  });
  it('customer page starts with heading and toolbar, has no excluded badge or large counters', () => {
    mocks.queries.mockReturnValue(state());
    const wrapper = mount(CustomerNotificationCenter, { global: { plugins: [router()] } });
    expect(wrapper.get('h1').text()).toBe('Thông báo');
    expect(wrapper.text()).not.toContain('Tài khoản khách hàng');
    expect(wrapper.text()).not.toContain('Tổng thông báo');
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(4);
    expect(wrapper.find('input[aria-label="Tìm thông báo"]').exists()).toBe(true);
    wrapper.unmount();
  });
});
