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

  it('formats the complete cycle as a named 24-round plan', () => {
    const plan = formatRotationPlan({
      A: 'Safety',
      B: 'Equipment',
      C: 'Inventory',
      D: 'Documentation',
    }).split('\n')

    expect(plan).toHaveLength(24)
    expect(plan[0]).toBe('Round 01: Safety -> Equipment -> Inventory -> Documentation')
    expect(plan.at(-1)).toBe('Round 24: Equipment -> Safety -> Inventory -> Documentation')
  })
})
