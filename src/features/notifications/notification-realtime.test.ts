// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'
import { reactive } from 'vue'
import type { RealtimeConnection } from '@/lib/realtime/connection'
import { installNotificationRealtime } from './notification-realtime'
const mocks = vi.hoisted(() => ({ auth: null as unknown, receive: vi.fn(), reset: vi.fn(), invalidate: vi.fn() }))
vi.mock('@/stores/auth.store', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/stores/branch.store', () => ({ useBranchStore: () => ({ selectedBranchId: 'branch' }) }))
vi.mock('@/lib/query-client', () => ({ queryClient: { invalidateQueries: mocks.invalidate, cancelQueries: vi.fn(), removeQueries: vi.fn() } }))
vi.mock('@/features/membership/membership-celebration', () => ({ membershipCelebration: { receive: mocks.receive, reset: mocks.reset } }))
afterEach(() => vi.clearAllMocks())
describe('new live membership event gating', () => {
  function setup() {
    const auth = reactive({ status: 'authenticated', user: { id: 'customer', type: 'CUSTOMER' }, get isAuthenticated() { return this.status === 'authenticated' } })
    mocks.auth = auth
    let handler!: (event: object) => void, reconcile!: () => void, reset!: () => void
    const manager = {
      on: (_name: string, listener: (event: object) => void) => { handler = listener; return () => undefined },
      onReconcile: (listener: () => void) => { reconcile = listener; return () => undefined },
      onReset: (listener: () => void) => { reset = listener; return () => undefined },
    } as unknown as RealtimeConnection
    const stop = installNotificationRealtime(createPinia(), manager)
    return { auth, emit: (event: object) => handler(event), reconcile: () => reconcile(), reset: () => reset(), stop }
  }
  it('never opens from initial hydration, reconciliation, focus, mark-read or other notification types', () => {
    const state = setup()
    state.reconcile()
    window.dispatchEvent(new Event('focus'))
    for (const type of [undefined, 'ORDER_COMPLETED', 'COUPON_ACTIVE', 'FLASH_SALE_ACTIVE'])
      state.emit({ version: 1, branchId: null, id: 'id', type })
    state.emit({ version: 1, branchId: null, type: 'MEMBERSHIP_UPGRADED' })
    expect(mocks.receive).not.toHaveBeenCalled()
    state.emit({ version: 1, branchId: null, type: 'MEMBERSHIP_UPGRADED', id: 'new' })
    expect(mocks.receive).toHaveBeenCalledExactlyOnceWith('customer', 'new')
    state.stop()
  })
  it('rejects wrong scope/role/anonymous events and clears pending state on account switch', () => {
    const state = setup(), event = { version: 1, branchId: null, type: 'MEMBERSHIP_UPGRADED', id: 'new' }
    state.emit({ ...event, branchId: 'branch' })
    state.auth.user = { id: 'system', type: 'SYSTEM' }
    state.emit(event)
    state.auth.status = 'anonymous'
    state.emit(event)
    expect(mocks.receive).not.toHaveBeenCalled()
    expect(mocks.reset).toHaveBeenLastCalledWith(undefined)
    state.stop()
  })
})
