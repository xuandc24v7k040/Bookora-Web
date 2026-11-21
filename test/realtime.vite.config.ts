import { mergeConfig } from 'vite';
import base from '../vite.config';

/** Explicit test config only. Normal dev/build never imports the probe. */
export default mergeConfig(base, { plugins: [{ name: 'bookora-test-realtime-probe', enforce: 'pre',
  transform(code: string, id: string) {
    if (id.replaceAll('\\', '/').endsWith('/src/main.ts'))
      return `${code}\nimport '/test/realtime-browser-probe.ts';`;
    if (id.replaceAll('\\', '/').endsWith('/src/lib/realtime/connection.ts'))
      return code.replace("socket.on('connect',", "window.dispatchEvent(new CustomEvent('bookora:test:socket', { detail: socket }));\nsocket.on('connect',");
  },
}] });
