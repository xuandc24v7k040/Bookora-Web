import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useSupportStore } from "../state/support.store";
import { ticketOrderContext, supportKeys } from "./support-api";

export function useSupportOrderContext() {
  const store = useSupportStore();
  return useQuery({
    queryKey: computed(() =>
      supportKeys.context(store.scope, store.activeId ?? "none"),
    ),
    queryFn: ({ signal }) =>
      ticketOrderContext(store.scope, store.activeId!, signal),
    enabled: computed(() => store.canUse && !!store.active?.orderId),
    staleTime: 30_000,
    retry: false,
  });
}
