import { describe, expect, it } from 'vitest'
import { validateThresholds } from './membership-threshold-form'
describe('membership threshold input validation', () => {
  it.each([
    '0',
    '-1',
    '1.5',
    'NaN',
    '2e6',
    '12abc',
    '9999999999999999999999999999999',
  ])('rejects %s rather than sanitizing it into another amount', (input) => {
    expect(
      validateThresholds(
        { silver: input, gold: '5000000', diamond: '10000000' },
        1,
      ).errors.silver,
    ).toBeTruthy()
  })
  it('accepts formatted VND and returns the canonical generated request shape', () => {
    expect(
      validateThresholds(
        { silver: '2.000.000', gold: '5.000.000', diamond: '10.000.000' },
        3,
      ).data,
    ).toEqual({ silver: 2000000, gold: 5000000, diamond: 10000000, version: 3 })
  })
  it('recomputes group errors when an invalid ordering is corrected', () => {
    expect(
      validateThresholds(
        { silver: '5000000', gold: '5000000', diamond: '10000000' },
        1,
      ).errors.gold,
    ).toBeTruthy()
    expect(
      validateThresholds(
        { silver: '2000000', gold: '5000000', diamond: '10000000' },
        1,
      ).errors,
    ).toEqual({})
  })
})
