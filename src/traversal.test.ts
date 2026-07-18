import { describe, expect, it } from 'vitest'
import {
  BALANCE_MATRIX,
  HELIX_STATES,
  TASK_IDS,
  adjacentSwapPositions,
  formatRotationPlan,
  stateAt,
} from './traversal'

describe('Helix traversal', () => {
  it('matches the specified cyclic sequence exactly', () => {
    expect(HELIX_STATES.map((state) => state.join(''))).toEqual([
      'ABCD', 'ABDC', 'ADBC', 'DABC', 'DACB', 'ADCB',
      'ACDB', 'ACBD', 'CABD', 'CADB', 'CDAB', 'DCAB',
      'DCBA', 'CDBA', 'CBDA', 'CBAD', 'BCAD', 'BCDA',
      'BDCA', 'DBCA', 'DBAC', 'BDAC', 'BADC', 'BACD',
    ])
  })

  it('contains exactly 24 unique states', () => {
    expect(HELIX_STATES).toHaveLength(24)
    expect(new Set(HELIX_STATES.map((state) => state.join(''))).size).toBe(24)
  })

  it('contains only permutations of ABCD', () => {
    HELIX_STATES.forEach((state) => {
      expect([...state].sort()).toEqual([...TASK_IDS])
    })
  })

  it('changes by one adjacent swap at every forward transition', () => {
    for (let index = 0; index < HELIX_STATES.length - 1; index += 1) {
      expect(adjacentSwapPositions(HELIX_STATES[index], HELIX_STATES[index + 1])).not.toBeNull()
    }
  })

  it('connects the final state back to ABCD with one adjacent swap', () => {
    expect(adjacentSwapPositions(HELIX_STATES.at(-1)!, HELIX_STATES[0])).not.toBeNull()
    expect(stateAt(24)).toEqual(HELIX_STATES[0])
  })

  it('places every task in every position exactly six times', () => {
    TASK_IDS.forEach((task) => {
      expect(BALANCE_MATRIX[task]).toEqual([6, 6, 6, 6])
    })
  })

  it('formats the complete cycle as a named 24-day schedule', () => {
    const plan = formatRotationPlan({
      A: 'Company A',
      B: 'Company B',
      C: 'Company C',
      D: 'Company D',
    }, HELIX_STATES, ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM']).split('\n')

    expect(plan).toHaveLength(24)
    expect(plan[0]).toBe('Day 01: 9:00 AM Company A | 11:00 AM Company B | 1:00 PM Company C | 3:00 PM Company D')
    expect(plan.at(-1)).toBe('Day 24: 9:00 AM Company B | 11:00 AM Company A | 1:00 PM Company C | 3:00 PM Company D')
  })
})
