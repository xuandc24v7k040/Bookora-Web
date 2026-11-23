import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue'

interface TimeBoundary {
  serverNow: string
  nextTransitionAt: string | null
}

/** One timer per mounted query; elapsed time uses a monotonic browser clock. */
export function useTimeBoundaryRefetch(options: {
  metadata: MaybeRefOrGetter<TimeBoundary | undefined>
  fetching: MaybeRefOrGetter<boolean>
  requestStartedAt: () => number
  refetch: () => Promise<unknown>
}) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let attemptedSnapshot: string | undefined
  let disposed = false
  const clear = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined }
  const refetch = () => {
    if (!disposed && !toValue(options.fetching)) void options.refetch().catch(() => undefined)
  }
  const stop = watch(() => [toValue(options.metadata), toValue(options.fetching)] as const, ([metadata, fetching]) => {
    clear()
    if (!metadata?.nextTransitionAt || fetching) return
    const boundary = Date.parse(metadata.nextTransitionAt), server = Date.parse(metadata.serverNow)
    if (!Number.isFinite(boundary) || !Number.isFinite(server)) return
    const snapshot = `${metadata.serverNow}:${metadata.nextTransitionAt}`
    if (attemptedSnapshot === snapshot) return
    const elapsed = Math.max(0, performance.now() - options.requestStartedAt())
    const remaining = boundary - server - elapsed + 100
    timer = setTimeout(() => {
      timer = undefined
      attemptedSnapshot = snapshot
      refetch()
    }, Math.min(2_147_483_647, Math.max(250, remaining)))
  }, { immediate: true })
  const visible = () => { if (document.visibilityState === 'visible') refetch() }
  document.addEventListener('visibilitychange', visible)
  onScopeDispose(() => { disposed = true; clear(); stop(); document.removeEventListener('visibilitychange', visible) })
}
