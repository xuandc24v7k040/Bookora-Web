// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, shallowMount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import AccountOrderDetailPage from '@/pages/app/account/AccountOrderDetailPage.vue';
import { customerOrderKeys } from './api/customer-orders-api';

const api = vi.hoisted(() => ({ detail: vi.fn() }));
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { orderId: 'fixture-order' } }), useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('./api/customer-orders-api', async (original) => ({
  ...await original<typeof import('./api/customer-orders-api')>(), getCustomerOrder: api.detail,
}));
vi.mock('./components/CustomerReceiptConfirmationAction.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/features/engagement/components/ReviewFormDialog.vue', () => ({ default: { template: '<div />' } }));
const order = {
  id: 'fixture-order', orderCode: 'BK-PRIVATE-FIXTURE', status: 'CONFIRMED',
  customerReceiptConfirmation: { confirmed: false, confirmedAt: null },
  allowedActions: { cancel: false, confirmReceived: false },
  paymentMethod: 'COD', paymentStatus: 'UNPAID', placedAt: '2026-11-21T00:00:00Z',
  subtotalAmount: 100000, discountAmount: 0, shippingFee: 32000, totalAmount: 132000,
  items: [], receiverName: 'Fixture', receiverPhone: '0900000000', shippingAddress: 'Fixture', branchName: 'Fixture',
};
let client: QueryClient;
beforeEach(() => { api.detail.mockReset(); client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => client.clear());
function render() {
  return shallowMount(AccountOrderDetailPage, { global: {
    plugins: [[VueQueryPlugin, { queryClient: client }]], renderStubDefaultSlot: true,
    stubs: { RouterLink: { template: '<a><slot /></a>' }, Button: { template: '<button><slot /></button>' } },
  } });
}
describe('Customer Order Detail protected refetch rendering', () => {
  it.each([401, 403, 404])('hides previously cached Order content when REST refetch returns %s', async (status) => {
    client.setQueryData(customerOrderKeys.detail(order.id), order);
    const view = render(); await nextTick(); expect(view.text()).toContain(order.orderCode);
    api.detail.mockRejectedValue({ response: { status } });
    await client.invalidateQueries({ queryKey: customerOrderKeys.detail(order.id) });
    await flushPromises(); await nextTick();
    expect(client.getQueryData(customerOrderKeys.detail(order.id))).toBeDefined();
    expect(view.text()).not.toContain(order.orderCode);
    expect(view.get('[role="alert"]').text()).toContain('Không thể tải thông tin đơn hàng');
    view.unmount();
  });

  it('shows a retry state after session reset and restores only the new canonical response', async () => {
    client.setQueryData(customerOrderKeys.detail(order.id), order);
    const view = render(); await nextTick();
    client.getQueryCache().find({ queryKey: customerOrderKeys.detail(order.id) })!.reset();
    await nextTick(); expect(view.text()).not.toContain(order.orderCode);
    expect(view.get('[role="alert"]').text()).toContain('Thử lại');
    api.detail.mockResolvedValue({ ...order, status: 'SHIPPING' });
    await view.get('[role="alert"] button').trigger('click');
    await flushPromises(); await nextTick();
    expect(view.text()).toContain(order.orderCode); expect(view.text()).toContain('Đang giao hàng');
    view.unmount();
  });
});
