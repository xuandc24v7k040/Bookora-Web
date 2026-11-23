import { defineConfig, mergeConfig } from 'vite'
import base from '../vite.config'
import { execFileSync } from 'node:child_process'

// Explicit test server only. Production Vite config never imports this probe.
export default mergeConfig(base, defineConfig({
  plugins: [{
    name: 'promotion-browser-observer',
    enforce: 'pre',
    transform(code, id) {
      if (process.env.LATENCY_PHASE === 'before-browser') {
        const relative = id.replaceAll('\\', '/').split('/src/')[1]
        if (relative === 'features/coupons/use-admin-coupons.ts' || relative === 'features/flash-sales/api/flash-sale-api.ts')
          return execFileSync('git', ['show', `743f38fcc9fb699af702904b07430c5f68acf418:src/${relative}`], { encoding: 'utf8' })
      }
      if (!id.replaceAll('\\', '/').endsWith('/src/main.ts')) return
      return `${code}\nimport { observePromotionRuntime } from '/test/promotion-browser-probe.ts';\nobservePromotionRuntime(realtimeSession.connection, queryClient);`
    },
  }],
}))
