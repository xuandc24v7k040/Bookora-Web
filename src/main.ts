import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { queryClient } from '@/lib/query-client'
import { router } from '@/router'
import { useAuthStore } from '@/stores/auth.store'
import { useThemeStore } from '@/stores/theme.store'
import { setupApiInterceptors } from '@/services/api'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(VueQueryPlugin, { queryClient })

setupApiInterceptors(pinia)

useAuthStore(pinia).restoreFromStorage()
useThemeStore(pinia).initTheme()

app.mount('#app')
