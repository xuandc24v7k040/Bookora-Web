import { io, type Socket } from 'socket.io-client';
import { shallowRef } from 'vue';

export interface RealtimeEvents {} // Domain contracts augment this interface.
export type RealtimeStatus = 'offline' | 'connecting' | 'connected';

/** One manager per application/tab, shared by every domain and mounted view. */
export class RealtimeConnection {
  readonly status = shallowRef<RealtimeStatus>('offline');
  private socket: Socket | null = null;
  private readonly handlers = new Map<string, Set<(payload: unknown) => void>>();
  private recovering = false;
  private lastRecoveryAt = 0;
  private generation = 0;
  private readonly reconcilers = new Set<() => void>();
  private readonly resetListeners = new Set<() => void>();

  private readonly url: string;
  private readonly path: string;
  private readonly recoverSession: () => Promise<boolean>;
  private readonly reconcile: () => void;
  constructor(url: string, path: string, recoverSession: () => Promise<boolean>, reconcile: () => void = () => {}) {
    this.url = url; this.path = path; this.recoverSession = recoverSession; this.reconcile = reconcile;
  }

  onReconcile(listener: () => void): () => void {
    this.reconcilers.add(listener);
    return () => { this.reconcilers.delete(listener); };
  }

  onReset(listener: () => void): () => void {
    this.resetListeners.add(listener);
    return () => { this.resetListeners.delete(listener); };
  }

  private reconcileDomains(): void {
    this.reconcile();
    for (const listener of this.reconcilers) listener();
  }

  on<K extends keyof RealtimeEvents & string>(name: K, listener: (payload: RealtimeEvents[K]) => void): () => void {
    const wrapped = (payload: unknown) => listener(payload as RealtimeEvents[K]);
    const handlers = this.handlers.get(name) ?? new Set();
    handlers.add(wrapped);
    this.handlers.set(name, handlers);
    return () => { handlers.delete(wrapped); };
  }

  connect(): void {
    if (this.socket) { if (!this.socket.connected) this.socket.connect(); return; }
    const generation = ++this.generation;
    this.status.value = 'connecting';
    const socket = io(`${this.url}/realtime`, { path: this.path, withCredentials: true,
      reconnectionAttempts: 5, reconnectionDelay: 1000, reconnectionDelayMax: 30000,
      randomizationFactor: 0.5, autoConnect: false });
    this.socket = socket;
    socket.on('connect', () => { this.status.value = 'connected'; this.reconcileDomains(); });
    socket.on('disconnect', () => { this.status.value = 'offline'; });
    const recover = async () => {
      if (this.recovering || Date.now() - this.lastRecoveryAt < 10000) return;
      this.recovering = true;
      this.lastRecoveryAt = Date.now();
      try {
        for (const listener of this.resetListeners) listener();
        const valid = await this.recoverSession();
        if (valid && this.generation === generation) { socket.connect(); this.reconcileDomains(); }
      } finally { this.recovering = false; }
    };
    socket.on('realtime.session', () => { socket.disconnect(); void recover(); });
    socket.on('connect_error', (error: Error) => {
      this.status.value = 'offline';
      if (error.message === 'REALTIME_UNAUTHORIZED') void recover();
    });
    socket.onAny((name: string, payload: unknown) => {
      for (const handler of this.handlers.get(name) ?? []) handler(payload);
    });
    socket.connect();
  }

  disconnect(): void {
    ++this.generation;
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.status.value = 'offline';
    for (const listener of this.resetListeners) listener();
  }
}
