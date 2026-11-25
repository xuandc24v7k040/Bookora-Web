// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
const contactOrder=vi.hoisted(()=>vi.fn());
vi.mock('../state/support.store',()=>({useSupportStore:()=>({contextLoading:false,contactOrder})}));
import SupportOrderContact from './SupportOrderContact.vue';
describe('Order contact entry point',()=>{
  it('forwards the exact owned order ID to the shared chat controller without creating a route',async()=>{
    const wrapper=mount(SupportOrderContact,{props:{orderId:'exact-order-id'}});
    await wrapper.get('button').trigger('click');
    expect(contactOrder).toHaveBeenCalledWith('exact-order-id'); expect(wrapper.find('a').exists()).toBe(false);
  });
});
