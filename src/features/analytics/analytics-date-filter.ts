export type AnalyticsPreset = "7D" | "30D" | "90D" | "CUSTOM";
export type AnalyticsDateFilter =
  | { preset: Exclude<AnalyticsPreset, "CUSTOM">; from: ""; to: "" }
  | { preset: "CUSTOM"; from: string; to: string };

function dateTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value
    ? timestamp
    : null;
}

export function isValidAnalyticsDateRange(from: unknown, to: unknown): boolean {
  const start = dateTimestamp(from);
  const end = dateTimestamp(to);
  return (
    start !== null &&
    end !== null &&
    end >= start &&
    (end - start) / 86_400_000 < 366
  );
}

export function normalizeAnalyticsDateFilter(input: {
  preset?: unknown;
  from?: unknown;
  to?: unknown;
}): AnalyticsDateFilter {
  if (
    (input.preset === "CUSTOM" || input.preset === undefined) &&
    isValidAnalyticsDateRange(input.from, input.to)
  ) {
    return {
      preset: "CUSTOM",
      from: input.from as string,
      to: input.to as string,
    };
  }
  return {
    preset:
      input.preset === "7D" || input.preset === "90D" ? input.preset : "30D",
    from: "",
    to: "",
  };
}
