import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { RealtimeConnection } from './connection';

const mock = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  return { handlers, io: vi.fn(), connect: vi.fn(), disconnect: vi.fn(), remove: vi.fn() };
});
vi.mock('socket.io-client', () => ({ io: mock.io }));
beforeEach(() => {
  vi.clearAllMocks(); mock.handlers.clear();
  mock.io.mockReturnValue({ connected: false, connect: mock.connect,
    disconnect: mock.disconnect, removeAllListeners: mock.remove,
    on: (name: string, handler: (...args: unknown[]) => void) => mock.handlers.set(name, handler),
    onAny: vi.fn(),
  });
});

describe('shared realtime connection lifecycle', () => {
  it('reconciles independent domains and removes their subscriptions cleanly', () => {
    const manager = new RealtimeConnection('https://api.example.test', '/socket.io', async () => true);
    const notifications = vi.fn(), futureDomain = vi.fn(), reset = vi.fn();
    const stopNotifications = manager.onReconcile(notifications);
    manager.onReconcile(futureDomain);
    const stopReset = manager.onReset(reset);
    manager.connect(); mock.handlers.get('connect')?.();
    expect(notifications).toHaveBeenCalledOnce(); expect(futureDomain).toHaveBeenCalledOnce();
    stopNotifications(); mock.handlers.get('connect')?.();
    expect(notifications).toHaveBeenCalledOnce(); expect(futureDomain).toHaveBeenCalledTimes(2);
    manager.disconnect(); expect(reset).toHaveBeenCalledOnce();
    stopReset(); manager.disconnect(); expect(reset).toHaveBeenCalledOnce();
  });
  it('reuses one socket, authenticates with cookies and reconciles on connection', () => {
    const reconcile = vi.fn();
    const manager = new RealtimeConnection('https://api.example.test', '/socket.io', async () => true, reconcile);
    manager.connect(); manager.connect();
    expect(mock.io).toHaveBeenCalledTimes(1);
    expect(mock.io).toHaveBeenCalledWith('https://api.example.test/realtime', expect.objectContaining({ withCredentials: true, reconnectionAttempts: 5 }));
    mock.handlers.get('connect')?.();
    expect(manager.status.value).toBe('connected'); expect(reconcile).toHaveBeenCalledOnce();
    manager.disconnect(); expect(mock.disconnect).toHaveBeenCalledOnce(); expect(manager.status.value).toBe('offline');
  });
  it('does not reconnect an old session after logout while recovery is in flight', async () => {
    let finish!: (valid: boolean) => void;
    const manager = new RealtimeConnection('https://api.example.test', '/socket.io',
      () => new Promise<boolean>((resolve) => { finish = resolve; }), vi.fn());
    manager.connect(); mock.handlers.get('realtime.session')?.();
    manager.disconnect(); finish(true); await flushPromises();
    expect(mock.connect).toHaveBeenCalledTimes(1);
    expect(mock.remove).toHaveBeenCalledOnce();
  });
});
