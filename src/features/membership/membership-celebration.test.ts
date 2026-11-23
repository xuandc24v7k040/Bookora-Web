import { describe, expect, it, vi } from 'vitest'
import { createMembershipCelebration } from './membership-celebration'
import type { MembershipTier } from './membership-ui'

describe('live membership celebration state', () => {
  it('starts empty; uses the verified final tier and deduplicates live IDs', async () => {
    const load = vi.fn(async () => 'GOLD' as const)
    const state = createMembershipCelebration(load)
    state.reset('a')
    expect(state.pending.value).toBeNull()
    await state.receive('a', 'new-order-upgrade')
    expect(state.pending.value).toEqual({ userId: 'a', tier: 'GOLD' })
    state.dismiss()
    await state.receive('a', 'new-order-upgrade')
    expect(state.pending.value).toBeNull()
    expect(load).toHaveBeenCalledTimes(1)
    state.reset('a') // Recovery of the same session does not forget seen events.
    await state.receive('a', 'new-order-upgrade')
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('cancels an in-flight tier lookup on logout/account switch', async () => {
    let complete!: (tier: MembershipTier) => void
    const state = createMembershipCelebration(() => new Promise(resolve => { complete = resolve }))
    const receiving = state.receive('a', 'id')
    state.reset('b')
    complete('DIAMOND')
    await receiving
    expect(state.pending.value).toBeNull()
  })

  it('keeps at most one, latest verified event when responses arrive out of order', async () => {
    const resolvers: Array<(tier: MembershipTier) => void> = []
    const state = createMembershipCelebration(() => new Promise(resolve => resolvers.push(resolve)))
    const first = state.receive('a', 'first'), last = state.receive('a', 'last')
    resolvers[1]!('DIAMOND')
    await last
    resolvers[0]!('SILVER')
    await first
    expect(state.pending.value).toEqual({ userId: 'a', tier: 'DIAMOND' })
  })

  it('fails closed on a failed authority request', async () => {
    const state = createMembershipCelebration(async () => { throw new Error('offline') })
    await state.receive('a', 'id')
    expect(state.pending.value).toBeNull()
  })
})
