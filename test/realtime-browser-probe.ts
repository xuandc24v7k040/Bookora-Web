import { nextTick } from 'vue';
import type { Socket } from 'socket.io-client';
import { apiClient } from '@/api/http/client';
import { queryClient } from '@/lib/query-client';
import { env } from '@/lib/env';

// Only served through test/realtime.vite.config.ts. Logs contain fixture IDs/state, never DTOs/cookies.
const base = new URL(env.apiBaseUrl, location.origin).origin;
const session = `${location.hostname}:${crypto.randomUUID().slice(0, 8)}`;
let lastClick = performance.now();
document.addEventListener('click', () => { lastClick = performance.now(); }, true);
const epoch = () => performance.timeOrigin + performance.now();
const calibration = (async () => {
  const samples = [];
  for (let index = 0; index < 5; index++) {
    const start = epoch();
    const response = await fetch(`${base}/_test/realtime/clock`, { credentials: 'include' });
    const value = await response.json() as { epochMs: number };
    const end = epoch(); samples.push({ offset: value.epochMs - (start + end) / 2, uncertainty: (end - start) / 2 });
  }
  return samples.sort((a, b) => a.uncertainty - b.uncertainty)[0]!;
})();
async function observe(kind: string, fields: Record<string, unknown>, at = epoch()) {
  const clock = await calibration;
  await fetch(`${base}/_test/realtime/observation`, { method: 'POST', credentials: 'include',
    body: JSON.stringify({ kind, session, at: at + clock.offset, uncertainty: clock.uncertainty,
      route: location.pathname, visibility: document.visibilityState, ...fields }) }).catch(() => undefined);
}
apiClient.interceptors.request.use((config) => {
  if (config.method?.toUpperCase() === 'POST' && /\/(admin|customer)\/orders\/.+\/(transitions|cancel|confirm-received)$/.test(config.url ?? '')) {
    const id = crypto.randomUUID(); config.headers.set('X-Bookora-Probe-Id', id);
    void observe('request-start', { id, clickAt: performance.timeOrigin + lastClick }, epoch());
  }
  return config;
});
apiClient.interceptors.response.use((response) => {
  const id: unknown = response.config.headers.get('X-Bookora-Probe-Id');
  if (typeof id === 'string') void observe('request-success', { id, status: response.status });
  return response;
}, (error: unknown) => {
  const failure = error as { response?: { status?: number; data?: { code?: string } }; config?: { url?: string } };
  void observe('request-error', { status: failure.response?.status, code: failure.response?.data?.code,
    path: failure.config?.url?.split('?')[0] });
  return Promise.reject(error);
});

window.addEventListener('bookora:test:socket', (event) => {
  const socket = (event as CustomEvent<Socket>).detail;
  socket.on('connect', () => { void observe('socket-connected', { transport: socket.io.engine.transport.name }); });
  socket.onAny((name: string, payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const data = payload as Record<string, unknown>;
    if (name === 'notification.changed' || name === 'order.changed')
      void observe('socket-event', { name, id: data.id, orderId: data.orderId, branchId: data.branchId });
  });
  const controls = document.createElement('div');
  document.getElementById('bookora-realtime-test-controls')?.remove();
  controls.id = 'bookora-realtime-test-controls';
  controls.style.cssText = 'position:fixed;bottom:4px;right:4px;z-index:1000;background:white;border:1px solid #64748b;font:11px sans-serif;padding:3px;display:flex;gap:6px';
  for (const action of ['disconnect', 'connect'] as const) {
    const button = document.createElement('button'); button.textContent = `Test socket ${action}`;
    button.setAttribute('aria-label', `Test socket ${action}`); button.style.cursor = 'pointer';
    button.onclick = () => { socket[action](); void observe(`socket-${action}`, {}); };
    controls.append(button);
  }
  document.body.append(controls);
});

const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const labels: Record<string, string[]> = { PENDING: ['Chờ xác nhận'], CONFIRMED: ['Đã xác nhận'], PACKING: ['Đang xử lý', 'Đang đóng gói'], SHIPPING: ['Đang vận chuyển', 'Đang giao', 'Đang giao hàng'], COMPLETED: ['Hoàn thành', 'Đã nhận hàng'], CANCELLED: ['Đã hủy'] };
const recent = new Set<string>();
queryClient.getQueryCache().subscribe((event) => {
  if (event.type !== 'updated' || event.action.type !== 'success') return;
  const key = event.query.queryKey;
  const data: unknown = event.query.state.data;
  const keyText = JSON.stringify(key);
  if (key[0] === 'notifications') {
    void (async () => {
      await nextTick(); await new Promise(requestAnimationFrame);
      const lists = queryClient.getQueriesData({ queryKey: ['notifications'] }).flatMap(([, value]) => record(value) && Array.isArray(value.items) ? value.items : []);
      const ids = lists.filter(record).map((item) => item.id).filter((id): id is string => typeof id === 'string');
      const bell = [...document.querySelectorAll<HTMLButtonElement>('button[aria-label^="Thông báo,"]')].find((element) => element.offsetParent !== null);
      if (bell) void observe('notification-ui', { ids: [...new Set(ids)], bell: bell.getAttribute('aria-label') });
    })();
    return;
  }
  if (!keyText.includes('customer-order') && !keyText.includes('admin-orders')) return;
  const value = record(data) && record(data.data) ? data.data : data;
  const orders = record(value) && typeof value.id === 'string' ? [value]
    : record(value) && Array.isArray(value.items) ? value.items
    : record(value) && Array.isArray(value.data) ? value.data
    : [];
  void (async () => {
    await nextTick(); await new Promise(requestAnimationFrame);
    for (const order of orders) {
      if (!record(order) || typeof order.id !== 'string' || typeof order.orderCode !== 'string' || typeof order.status !== 'string') continue;
      const receipt = record(order.customerReceiptConfirmation) ? order.customerReceiptConfirmation.confirmed : undefined;
      const signature = `${location.pathname}:${order.id}:${order.status}:${receipt}`;
      if (recent.has(signature)) continue;
      const expected = receipt && order.status === 'SHIPPING' ? ['Đã nhận hàng', 'Đang giao'] : labels[order.status] ?? [];
      const detail = key[0] === 'customer-order' || key.includes('detail');
      const containers = [...document.querySelectorAll(detail ? 'main' : 'li,tr')].filter((element) =>
        detail ? element.querySelector('h1')?.textContent?.includes(String(order.orderCode)) : element.textContent?.includes(String(order.orderCode)));
      const visible = containers.some((element) => [...element.querySelectorAll('[data-slot="badge"]')].some((badge) => expected.includes(badge.textContent?.trim() ?? '')));
      if (!visible) continue;
      recent.add(signature); if (recent.size > 1000) recent.delete(recent.values().next().value!);
      void observe('order-ui', { orderId: order.id, status: order.status, receipt, key: keyText, rendered: true });
    }
  })();
});
void calibration.then((clock) => observe('clock', clock));
