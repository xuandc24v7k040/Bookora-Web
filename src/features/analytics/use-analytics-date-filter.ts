import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  normalizeAnalyticsDateFilter,
  type AnalyticsPreset,
} from "./analytics-date-filter";

export function useAnalyticsDateFilter() {
  const route = useRoute();
  const router = useRouter();
  const selection = ref(normalizeAnalyticsDateFilter(route.query));

  watch(
    () => route.query,
    (query) => {
      const next = normalizeAnalyticsDateFilter(query);
      if (JSON.stringify(next) !== JSON.stringify(selection.value))
        selection.value = next;
      const custom = next.preset === "CUSTOM";
      if (
        query.preset !== next.preset ||
        query.from !== (custom ? next.from : undefined) ||
        query.to !== (custom ? next.to : undefined)
      ) {
        void router.replace({
          query: {
            ...query,
            preset: next.preset,
            from: custom ? next.from : undefined,
            to: custom ? next.to : undefined,
          },
        });
      }
    },
    { immediate: true },
  );

  function selectPreset(preset: Exclude<AnalyticsPreset, "CUSTOM">): void {
    selection.value = normalizeAnalyticsDateFilter({ preset });
  }

  function selectCustom(range: { from: string; to: string }): void {
    selection.value = normalizeAnalyticsDateFilter({
      preset: "CUSTOM",
      ...range,
    });
  }

  return {
    preset: computed(() => selection.value.preset),
    from: computed(() => selection.value.from),
    to: computed(() => selection.value.to),
    selectPreset,
    selectCustom,
  };
}
