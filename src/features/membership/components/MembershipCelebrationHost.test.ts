// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import MembershipCelebrationHost from './MembershipCelebrationHost.vue'
import { membershipCelebration } from '../membership-celebration'
import { tierLabels, type MembershipTier } from '../membership-ui'
const mocks = vi.hoisted(() => ({ auth: null as unknown }))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => mocks.auth }))
afterEach(() => { membershipCelebration.reset(); document.body.innerHTML = '' })
describe('membership celebration host', () => {
  async function setup(path = '/') {
    setActivePinia(createPinia())
    mocks.auth = reactive({ isAuthenticated: true, user: { id: 'a', type: 'CUSTOMER' } })
    const router = createRouter({ history: createMemoryHistory(), routes: ['/', '/checkout', '/account/membership'].map(path => ({ path, component: { template: '<div />' } })) })
    await router.push(path)
    await router.isReady()
    const wrapper = mount(MembershipCelebrationHost, { attachTo: document.body, global: { plugins: [router] } })
    return { router, wrapper }
  }
  it.each(Object.keys(tierLabels) as MembershipTier[])('renders %s accent and existing accessible Dialog/CTA', async tier => {
    const { wrapper, router } = await setup()
    membershipCelebration.pending.value = { userId: 'a', tier }
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(`Hạng ${tierLabels[tier]}`)
    const button = [...document.querySelectorAll('button')].find(button => button.textContent?.includes('Khám phá quyền lợi'))!
    button.click()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/account/membership')
    expect(membershipCelebration.pending.value).toBeNull()
    wrapper.unmount()
  })
  it('defers a live event in Checkout until a safe route without replaying history', async () => {
    const { wrapper, router } = await setup('/checkout')
    membershipCelebration.pending.value = { userId: 'a', tier: 'GOLD' }
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    await router.push('/')
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    wrapper.unmount()
  })
  it('defers while another critical modal is open and resumes after it closes', async () => {
    const { wrapper } = await setup()
    const critical = document.createElement('div')
    critical.setAttribute('role', 'alertdialog')
    critical.setAttribute('data-state', 'open')
    document.body.append(critical)
    await new Promise(resolve => setTimeout(resolve, 0))
    membershipCelebration.pending.value = { userId: 'a', tier: 'DIAMOND' }
    await flushPromises()
    expect(document.querySelector('[data-membership-celebration]')).toBeNull()
    critical.remove()
    await new Promise(resolve => setTimeout(resolve, 0))
    await flushPromises()
    expect(document.querySelector('[data-membership-celebration]')).not.toBeNull()
    wrapper.unmount()
  })
  it('keeps one decorative effect instance while the same dialog stays open', async () => {
    const { wrapper, router } = await setup()
    try {
      membershipCelebration.pending.value = { userId: 'a', tier: 'SILVER' }
      await flushPromises()
      const effects = document.querySelector('.celebration-effects')
      expect(effects?.getAttribute('aria-hidden')).toBe('true')
      expect(effects?.querySelectorAll('button, a, [tabindex]')).toHaveLength(0)
      await router.replace({ query: { view: 'details' } })
      await flushPromises()
      expect(document.querySelector('.celebration-effects')).toBe(effects)
      expect(document.querySelectorAll('.celebration-effects')).toHaveLength(1)
      membershipCelebration.dismiss()
      await flushPromises()
      expect(document.querySelector('.celebration-effects')).toBeNull()
    } finally {
      wrapper.unmount()
    }
  })
})
