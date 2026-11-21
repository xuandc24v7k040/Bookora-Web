import { CheckCircle2, ClipboardCheck, CreditCard, Package, Tag, Truck, XCircle, Zap } from '@lucide/vue';

export function notificationIcon(type: string) {
  if (type === 'COUPON_ACTIVE') return Tag;
  if (type === 'FLASH_SALE_ACTIVE') return Zap;
  if (type.includes('PAYMENT')) return CreditCard;
  if (type.includes('CANCEL') || type === 'PAYMENT_TERMINAL') return XCircle;
  if (type === 'ORDER_SHIPPING') return Truck;
  if (type === 'ORDER_COMPLETED' || type === 'ORDER_RECEIVED') return CheckCircle2;
  if (type === 'ORDER_CONFIRMED') return ClipboardCheck;
  return Package;
}

export function notificationTime(value: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`;
  return new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' });
}

export function notificationGroup(value: string, now = Date.now()): string {
  const day = (date: number) => new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const created = day(new Date(value).getTime());
  return created === day(now) ? 'Hôm nay' : created === day(now - 86400000) ? 'Hôm qua' : 'Trước đó';
}
