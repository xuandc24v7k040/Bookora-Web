const formatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatShippingEta(value: string): string {
  return Number.isFinite(Date.parse(value))
    ? formatter.format(new Date(value))
    : "Chưa xác định";
}
