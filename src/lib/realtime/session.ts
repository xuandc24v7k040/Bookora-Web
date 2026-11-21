import { watch } from 'vue';
import type { Pinia } from 'pinia';
import { env } from '@/lib/env';
import { useAuthStore } from '@/stores/auth.store';
import { RealtimeConnection } from './connection';

/** Auth owns the connection lifetime; domains only attach handlers/reconcilers. */
export function installRealtimeSession(pinia: Pinia) {
  const auth = useAuthStore(pinia);
  const connection = new RealtimeConnection(
    new URL(env.apiBaseUrl, location.origin).origin,
    import.meta.env.VITE_REALTIME_PATH || '/socket.io',
    async () => {
      try { await auth.refreshCurrentUser(); return true; }
      catch { return false; }
    },
  );
  const stop = watch(() => `${auth.status}:${auth.user?.id ?? ''}:${auth.user?.type ?? ''}`,
    () => {
      connection.disconnect();
      if (auth.isAuthenticated) connection.connect();
    }, { immediate: true, flush: 'sync' });
  const focus = () => { if (auth.isAuthenticated) connection.connect(); };
  window.addEventListener('focus', focus);
  return { connection, dispose: () => {
    stop(); connection.disconnect(); window.removeEventListener('focus', focus);
  } };
}
