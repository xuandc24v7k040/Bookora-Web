import type { QueryClient } from '@tanstack/vue-query'
import type { RealtimeConnection } from '@/lib/realtime/connection'
import { env } from '@/lib/env'

/** Passive observer of real socket, REST cache and rendered DOM. No mock events. */
export function observePromotionRuntime(connection: RealtimeConnection, queries: QueryClient) {
  const api = new URL(env.apiBaseUrl).origin
  const session = `${location.host}:${crypto.randomUUID()}`
  const live = new Map<string, number>()
  const bellCount = () => Number(document.querySelector('button[aria-label^="Thông báo,"]')?.getAttribute('aria-label')?.match(/\d+/)?.[0] ?? 0)
  let offset = 0, uncertainty = Infinity
  const now = () => performance.timeOrigin + performance.now()
  const record = (kind: string, data: object) => {
    void fetch(`${api}/_test/realtime/observation`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ kind, session, at: now() + offset, uncertainty, visibility: document.visibilityState, path: location.pathname, ...data }) }).catch(() => undefined)
  }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const environment = () => record('environment', { reducedMotion: reducedMotion.matches, hidden: document.hidden, focused: document.hasFocus(), viewport: { width: innerWidth, height: innerHeight } })
  document.addEventListener('visibilitychange', environment)
  window.addEventListener('focus', environment)
  reducedMotion.addEventListener('change', environment)
  environment()
  void (async () => {
    for (let n = 0; n < 7; n++) {
      const start = now()
      const response = await fetch(`${api}/_test/realtime/clock`)
      const clock = await response.json() as { epochMs: number }
      const end = now(), margin = (end - start) / 2
      if (margin < uncertainty) { uncertainty = margin; offset = clock.epochMs - (start + end) / 2 }
    }
    record('clock', { offset })
    environment()
  })().catch(() => undefined)
  connection.on('notification.changed', event => {
    record('socket', event)
    if (event.id) live.set(event.id, bellCount())
  })
  queries.getQueryCache().subscribe(event => {
    const query = event.query
    if (event.type !== 'updated' || event.action.type !== 'success') return
    if (['notifications', 'admin-coupons', 'admin-flash-sales'].includes(String(query.queryKey[0]))) {
      record('rest-cache', { key: query.queryKey, data: query.state.data })
      requestAnimationFrame(() => {
        const cache = queries.getQueriesData({ queryKey: ['notifications'] })
        const serialized = JSON.stringify(cache)
        for (const [id, before] of live) {
          if (bellCount() > before && serialized.includes(id)) {
            record('bell-visible', { id, count: bellCount() })
            live.delete(id)
          }
        }
      })
    }
  })
  let previous = ''
  const observer = new MutationObserver(() => {
    const bell = document.querySelector('button[aria-label^="Thông báo,"]')?.getAttribute('aria-label')
    const rows = [...document.querySelectorAll('tbody tr')].map(row => row.textContent?.replace(/\s+/g, ' ').trim())
    const dialogElement = document.querySelector('[role="dialog"]')
    const dialog = dialogElement?.textContent
    const motion = dialogElement ? { animation: getComputedStyle(dialogElement).animationName, duration: getComputedStyle(dialogElement).animationDuration, transition: getComputedStyle(dialogElement).transitionDuration } : null
    const current = JSON.stringify({ bell, rows, dialog, motion })
    if (current === previous) return
    previous = current
    record('dom', { bell, rows, dialog, motion, reducedMotion: reducedMotion.matches })
  })
  observer.observe(document.body, { subtree: true, attributes: true, childList: true, characterData: true })
}
