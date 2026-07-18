import { describe, expect, it } from 'vitest'
import {
  DEMO_REQUEST,
  DEMO_VERDICTS,
  summarizeAudit,
  validateAuditRequest,
} from './audit'

describe('Agent Order Lab audit engine', () => {
  it('summarizes one verdict for every Helix state', () => {
    const summary = summarizeAudit(DEMO_VERDICTS)

    expect(summary.totalEvaluations).toBe(24)
    expect(Object.values(summary.winCounts).reduce((sum, wins) => sum + wins, 0)).toBe(24)
    expect(summary.isOrderSensitive).toBe(true)
    expect(summary.uniqueWinners).toBeGreaterThan(1)
  })

  it('attributes each win to the candidate and position shown to the judge', () => {
    const summary = summarizeAudit(DEMO_VERDICTS)

    Object.entries(summary.positionWinMatrix).forEach(([agent, positions]) => {
      expect(positions.reduce((sum, wins) => sum + wins, 0)).toBe(summary.winCounts[agent as keyof typeof summary.winCounts])
      positions.forEach((wins) => expect(wins).toBeLessThanOrEqual(6))
    })
  })

  it('counts winner changes around the complete adjacent-swap cycle', () => {
    const summary = summarizeAudit(DEMO_VERDICTS)
    const expected = DEMO_VERDICTS.reduce((flips, verdict, index) => {
      const next = DEMO_VERDICTS[(index + 1) % DEMO_VERDICTS.length]
      return flips + (verdict.winner === next.winner ? 0 : 1)
    }, 0)

    expect(summary.winnerFlipCount).toBe(expected)
    expect(summary.winnerFlipCount).toBeGreaterThan(0)
  })

  it('rejects incomplete or mismatched audit cycles', () => {
    expect(() => summarizeAudit(DEMO_VERDICTS.slice(0, 23))).toThrow(/24 verdicts/)

    const mismatched = DEMO_VERDICTS.map((verdict, index) => index === 4
      ? { ...verdict, order: DEMO_VERDICTS[5].order }
      : verdict)
    expect(() => summarizeAudit(mismatched)).toThrow(/required Helix order/)
  })

  it('validates all four named agent responses before a run', () => {
    expect(validateAuditRequest(DEMO_REQUEST)).toEqual([])
    expect(validateAuditRequest({ ...DEMO_REQUEST, rubric: '', agents: DEMO_REQUEST.agents.slice(0, 3) })).toEqual(expect.arrayContaining([
      'Add a judging rubric.',
      'Provide exactly four agent responses.',
      'Agent identities must be A, B, C, and D exactly once.',
    ]))
  })
})
