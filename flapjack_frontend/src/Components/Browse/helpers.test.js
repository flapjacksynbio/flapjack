import { compareText, compareNumber } from './helpers'

describe('compareText', () => {
  it('orders alphabetically', () => {
    expect(compareText('apple', 'banana')).toBeLessThan(0)
    expect(compareText('banana', 'apple')).toBeGreaterThan(0)
    expect(compareText('apple', 'apple')).toBe(0)
  })

  it('treats null and undefined as empty rather than throwing', () => {
    expect(() => compareText(null, 'a')).not.toThrow()
    expect(compareText(null, 'a')).toBeLessThan(0)
    expect(compareText(undefined, undefined)).toBe(0)
  })

  it('sorts a column containing gaps', () => {
    const rows = [{ name: 'zeta' }, { name: null }, { name: 'alpha' }]
    const sorted = [...rows].sort((a, b) => compareText(a.name, b.name))
    expect(sorted.map((r) => r.name)).toEqual([null, 'alpha', 'zeta'])
  })
})

describe('compareNumber', () => {
  it('orders numerically, not lexically', () => {
    expect(compareNumber(9, 10)).toBeLessThan(0)
  })

  it('treats null as zero rather than NaN, which would make sorting unstable', () => {
    expect(compareNumber(null, 5)).toBeLessThan(0)
    expect(Number.isNaN(compareNumber(null, null))).toBe(false)
  })
})
