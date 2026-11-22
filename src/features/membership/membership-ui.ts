import { Award, Crown, Gem, Medal } from '@lucide/vue'
import type { MembershipTierDto } from '@/api/generated/models'

export type MembershipTier = MembershipTierDto['tier']
export const tierLabels: Record<MembershipTier, string> = {
  BRONZE: 'Đồng',
  SILVER: 'Bạc',
  GOLD: 'Vàng',
  DIAMOND: 'Kim cương',
}
export const tierIcons = {
  BRONZE: Medal,
  SILVER: Award,
  GOLD: Crown,
  DIAMOND: Gem,
}
export const tierAccents: Record<MembershipTier, string> = {
  BRONZE: 'border-orange-200 bg-orange-50 text-orange-800',
  SILVER: 'border-slate-200 bg-slate-50 text-slate-600',
  GOLD: 'border-amber-200 bg-amber-50 text-amber-800',
  DIAMOND: 'border-sky-200 bg-sky-50 text-sky-700',
}
export function membershipDate(value: string | null): string {
  return value
    ? new Date(value).toLocaleDateString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
      })
    : 'Chưa có ngày xác định'
}
