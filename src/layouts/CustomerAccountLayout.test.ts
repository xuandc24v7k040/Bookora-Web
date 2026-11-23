// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import CustomerAccountLayout from './CustomerAccountLayout.vue'
import { membershipCelebration } from '@/features/membership/membership-celebration'

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => reactive({
    isAuthenticated: true,
    user: { id: 'customer-a', type: 'CUSTOMER' },
  }),
}))

afterEach(() => {
  membershipCelebration.reset()
  document.body.innerHTML = ''
})

it.each(['/account/orders', '/account/membership'])(
  'displays a new celebration within the actual account shell at %s',
  async path => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path, component: { template: '<p>Account content</p>' } }],
    })
    await router.push(path)
    await router.isReady()
    const wrapper = mount(CustomerAccountLayout, {
      attachTo: document.body,
      global: {
        plugins: [router],
        stubs: {
          ClientHeader: true,
          ClientFooter: true,
          CustomerAccountSidebar: true,
        },
      },
    })
    try {
      membershipCelebration.pending.value = { userId: 'customer-a', tier: 'GOLD' }
      await flushPromises()
      expect(document.querySelectorAll('[data-membership-celebration]')).toHaveLength(1)
      expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Hạng Vàng')
      expect(router.currentRoute.value.path).toBe(path)
    } finally {
      wrapper.unmount()
    }
  },
)
