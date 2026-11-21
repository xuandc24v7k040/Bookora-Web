import { createApp } from "vue";
import { installNotificationRealtime } from '@/features/notifications/notification-realtime';
import { installRealtimeSession } from '@/lib/realtime/session';
import { installOrderRealtime } from '@/features/orders/state/order-realtime';
import "./style.css";
import '@/features/notifications/notifications.css';
import App from "./App.vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import { queryClient } from "@/lib/query-client";
import { installEngagementSync } from "@/features/engagement/state/engagement-sync";
import { router } from "@/router";
import { useThemeStore } from "@/stores/theme.store";
import { setupApiInterceptors } from "@/services/api.service";
import { setupInventorySync } from "@/features/storefront/state/inventory-sync-channel";
import { useCartActions } from "@/features/cart/api/cart-api";
import { setupCartSync } from "@/features/cart/state/cart-sync-channel";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(VueQueryPlugin, { queryClient });

setupApiInterceptors(pinia, { queryClient, router });
const realtimeSession = installRealtimeSession(pinia);
const stopNotificationRealtime = installNotificationRealtime(pinia, realtimeSession.connection);
installEngagementSync(queryClient);
const stopInventorySync = setupInventorySync();
const stopCartSync = setupCartSync(() => useCartActions().refresh());
const stopOrderSync = installOrderRealtime(pinia, realtimeSession.connection);

useThemeStore(pinia).initTheme();

app.mount("#app");

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopInventorySync();
    stopNotificationRealtime();
    realtimeSession.dispose();
    stopCartSync();
    stopOrderSync();
  });
}
