import type {
  MembershipConfigDto,
  UpdateMembershipThresholdsDto,
} from '@/api/generated/models'
import { AdminMembershipUpdateConfigBody } from '@/api/generated/zod/admin-membership/admin-membership'

export const thresholdFields = [
  { key: 'silver', label: 'Bạc' },
  { key: 'gold', label: 'Vàng' },
  { key: 'diamond', label: 'Kim cương' },
] as const
export type ThresholdField = (typeof thresholdFields)[number]['key']
export type ThresholdInputs = Record<ThresholdField, string>
export function validateThresholds(inputs: ThresholdInputs, version: number) {
  const errors: Partial<Record<ThresholdField, string>> = {}
  const values = { silver: 0, gold: 0, diamond: 0, version }
  for (const { key, label } of thresholdFields) {
    const text = inputs[key].trim()
    const amount = Number(text.replaceAll('.', ''))
    if (
      !/^(\d+|\d{1,3}(\.\d{3})+)$/.test(text) ||
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      amount > 9_000_000_000_000_000
    )
      errors[key] =
        `Ngưỡng ${label} phải là số nguyên VND dương, tối đa 9.000.000.000.000.000đ.`
    values[key] = amount
  }
  if (!errors.silver && !errors.gold && values.silver >= values.gold)
    errors.gold = 'Ngưỡng Vàng phải lớn hơn ngưỡng Bạc.'
  if (!errors.gold && !errors.diamond && values.gold >= values.diamond)
    errors.diamond = 'Ngưỡng Kim cương phải lớn hơn ngưỡng Vàng.'
  const parsed = AdminMembershipUpdateConfigBody.safeParse(values)
  return {
    errors,
    data:
      !Object.keys(errors).length && parsed.success
        ? (parsed.data as UpdateMembershipThresholdsDto)
        : null,
  }
}
export function thresholdInputs(config: MembershipConfigDto): ThresholdInputs {
  const format = new Intl.NumberFormat('vi-VN')
  return {
    silver: format.format(config.silver),
    gold: format.format(config.gold),
    diamond: format.format(config.diamond),
  }
}
