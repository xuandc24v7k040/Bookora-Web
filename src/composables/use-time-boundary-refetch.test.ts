// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { useTimeBoundaryRefetch } from './use-time-boundary-refetch'

describe('server time boundary reconciliation', () => {
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
  function setup(delta: number | null = 1000) {
    vi.useFakeTimers()
    const server = Date.parse('2026-11-22T12:00:00Z')
    const metadata = ref({ serverNow: new Date(server).toISOString(), nextTransitionAt: delta === null ? null : new Date(server + delta).toISOString() })
    const fetching = ref(false), refetch = vi.fn(async () => undefined)
    const scope = effectScope()
    scope.run(() => useTimeBoundaryRefetch({ metadata, fetching, requestStartedAt: () => performance.now(), refetch }))
    return { metadata, fetching, refetch, scope }
  }
  it('refetches an empty filtered list at a hidden-row boundary despite wall-clock drift', async () => {
    const state = setup()
    vi.setSystemTime(new Date('2040-01-01'))
    await vi.advanceTimersByTimeAsync(1099)
    expect(state.refetch).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(state.refetch).toHaveBeenCalledTimes(1)
    state.scope.stop()
  })
  it('replaces deadlines and cleans up on disposal', async () => {
    const state = setup()
    state.metadata.value = { ...state.metadata.value, nextTransitionAt: '2026-11-22T12:00:03Z' }
    await nextTick()
    expect(vi.getTimerCount()).toBe(1)
    await vi.advanceTimersByTimeAsync(1200)
    expect(state.refetch).not.toHaveBeenCalled()
    state.scope.stop()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('does not poll with no boundary and reconciles on visibility restoration', () => {
    const state = setup(null)
    expect(vi.getTimerCount()).toBe(0)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(state.refetch).toHaveBeenCalledTimes(1)
    state.scope.stop()
    document.dispatchEvent(new Event('visibilitychange'))
    expect(state.refetch).toHaveBeenCalledTimes(1)
  })
  it('bounds malformed past deadlines and clears the timer while fetching', async () => {
    const state = setup(-1)
    await vi.advanceTimersByTimeAsync(250)
    expect(state.refetch).toHaveBeenCalledTimes(1)
    state.metadata.value = { ...state.metadata.value }
    await nextTick()
    expect(vi.getTimerCount()).toBe(0)
    state.metadata.value = { ...state.metadata.value, nextTransitionAt: '2026-11-22T12:00:03Z' }
    await nextTick()
    state.fetching.value = true
    await nextTick()
    expect(vi.getTimerCount()).toBe(0)
    state.scope.stop()
  })
  it('does not rearm stale metadata after an API failure; visibility can recover', async () => {
    const state = setup()
    state.refetch.mockRejectedValueOnce(new Error('offline'))
    await vi.advanceTimersByTimeAsync(1100)
    state.fetching.value = true
    await nextTick()
    state.fetching.value = false
    state.metadata.value = { ...state.metadata.value }
    await nextTick()
    await vi.advanceTimersByTimeAsync(10000)
    expect(state.refetch).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(state.refetch).toHaveBeenCalledTimes(2)
    state.scope.stop()
  })
})
