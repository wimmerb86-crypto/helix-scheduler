import { HELIX_STATES, TASK_IDS, type HelixState, type TaskId } from './traversal'

export type AgentSubmission = {
  id: TaskId
  name: string
  response: string
}

export type AuditRequest = {
  task: string
  rubric: string
  agents: readonly AgentSubmission[]
}

export type AuditVerdict = {
  stateIndex: number
  order: HelixState
  winner: TaskId
  winnerPosition: number
  scores: Record<TaskId, number>
  reason: string
}

export type AuditMatrix = Record<TaskId, readonly [number, number, number, number]>

export type AuditSummary = {
  totalEvaluations: number
  winCounts: Record<TaskId, number>
  positionWinMatrix: AuditMatrix
  averageScores: Record<TaskId, number>
  leadingAgent: TaskId | null
  leadingWinCount: number
  leadingAgreementRate: number
  winnerFlipCount: number
  uniqueWinners: number
  isOrderSensitive: boolean
}

export const AUDIT_INPUT_LIMITS = {
  task: 500,
  rubric: 500,
  agentName: 48,
  agentResponse: 1000,
} as const

const emptyCountRecord = (): Record<TaskId, number> => ({ A: 0, B: 0, C: 0, D: 0 })

const emptyMatrix = (): Record<TaskId, [number, number, number, number]> => ({
  A: [0, 0, 0, 0],
  B: [0, 0, 0, 0],
  C: [0, 0, 0, 0],
  D: [0, 0, 0, 0],
})

function orderedAndValidatedVerdicts(verdicts: readonly AuditVerdict[]): readonly AuditVerdict[] {
  if (verdicts.length !== HELIX_STATES.length) {
    throw new Error(`A complete Helix audit requires ${HELIX_STATES.length} verdicts.`)
  }

  const byState = new Map(verdicts.map((verdict) => [verdict.stateIndex, verdict]))
  if (byState.size !== HELIX_STATES.length) {
    throw new Error('Every Helix state must have exactly one verdict.')
  }

  return HELIX_STATES.map((expectedOrder, stateIndex) => {
    const verdict = byState.get(stateIndex)
    if (!verdict) throw new Error(`Missing verdict for Helix state ${stateIndex}.`)
    if (verdict.order.join('') !== expectedOrder.join('')) {
      throw new Error(`Verdict ${stateIndex} does not match the required Helix order.`)
    }

    const expectedWinnerPosition = expectedOrder.indexOf(verdict.winner)
    if (expectedWinnerPosition === -1 || verdict.winnerPosition !== expectedWinnerPosition) {
      throw new Error(`Verdict ${stateIndex} has an invalid winner position.`)
    }

    TASK_IDS.forEach((agent) => {
      if (!Number.isFinite(verdict.scores[agent])) {
        throw new Error(`Verdict ${stateIndex} is missing a numeric score for agent ${agent}.`)
      }
    })

    return verdict
  })
}

export function summarizeAudit(verdicts: readonly AuditVerdict[]): AuditSummary {
  const ordered = orderedAndValidatedVerdicts(verdicts)
  const winCounts = emptyCountRecord()
  const scoreTotals = emptyCountRecord()
  const positionWinMatrix = emptyMatrix()

  ordered.forEach((verdict) => {
    winCounts[verdict.winner] += 1
    positionWinMatrix[verdict.winner][verdict.winnerPosition] += 1
    TASK_IDS.forEach((agent) => {
      scoreTotals[agent] += verdict.scores[agent]
    })
  })

  const leadingWinCount = Math.max(...TASK_IDS.map((agent) => winCounts[agent]))
  const leaders = TASK_IDS.filter((agent) => winCounts[agent] === leadingWinCount)
  const uniqueWinners = TASK_IDS.filter((agent) => winCounts[agent] > 0).length
  const winnerFlipCount = ordered.reduce((flips, verdict, index) => {
    const next = ordered[(index + 1) % ordered.length]
    return flips + (verdict.winner === next.winner ? 0 : 1)
  }, 0)

  const averageScores = Object.fromEntries(
    TASK_IDS.map((agent) => [agent, scoreTotals[agent] / ordered.length]),
  ) as Record<TaskId, number>

  return {
    totalEvaluations: ordered.length,
    winCounts,
    positionWinMatrix,
    averageScores,
    leadingAgent: leaders.length === 1 ? leaders[0] : null,
    leadingWinCount,
    leadingAgreementRate: leadingWinCount / ordered.length,
    winnerFlipCount,
    uniqueWinners,
    isOrderSensitive: uniqueWinners > 1,
  }
}

export function validateAuditRequest(request: AuditRequest): string[] {
  const errors: string[] = []
  if (!request.task.trim()) errors.push('Describe the task being evaluated.')
  if (request.task.length > AUDIT_INPUT_LIMITS.task) errors.push(`Keep the task under ${AUDIT_INPUT_LIMITS.task} characters.`)
  if (!request.rubric.trim()) errors.push('Add a judging rubric.')
  if (request.rubric.length > AUDIT_INPUT_LIMITS.rubric) errors.push(`Keep the rubric under ${AUDIT_INPUT_LIMITS.rubric} characters.`)
  if (request.agents.length !== TASK_IDS.length) errors.push('Provide exactly four agent responses.')

  const ids = new Set(request.agents.map((agent) => agent.id))
  if (ids.size !== TASK_IDS.length || TASK_IDS.some((id) => !ids.has(id))) {
    errors.push('Agent identities must be A, B, C, and D exactly once.')
  }

  request.agents.forEach((agent) => {
    if (!agent.name.trim()) errors.push(`Agent ${agent.id} needs a name.`)
    if (agent.name.length > AUDIT_INPUT_LIMITS.agentName) errors.push(`Keep agent ${agent.id}'s name under ${AUDIT_INPUT_LIMITS.agentName} characters.`)
    if (!agent.response.trim()) errors.push(`Agent ${agent.id} needs a response.`)
    if (agent.response.length > AUDIT_INPUT_LIMITS.agentResponse) errors.push(`Keep agent ${agent.id}'s response under ${AUDIT_INPUT_LIMITS.agentResponse} characters.`)
  })

  return errors
}

export const DEMO_REQUEST: AuditRequest = {
  task: 'Choose the best recovery plan for a customer-facing deployment that is returning intermittent 500 errors.',
  rubric: 'Prefer a plan that limits customer impact, gathers evidence, preserves rollback options, and gives the team clear next actions.',
  agents: [
    {
      id: 'A',
      name: 'Atlas · Incident Planner',
      response: 'Pause the rollout, compare error rates by version and region, preserve logs, then roll back the affected cohort if the new release correlates with the failures. Assign owners for customer updates and root-cause analysis.',
    },
    {
      id: 'B',
      name: 'Beacon · Risk Analyst',
      response: 'Freeze further changes and open an incident channel. Quantify the blast radius, verify rollback health, notify support, and use a time-boxed decision point for rollback versus mitigation.',
    },
    {
      id: 'C',
      name: 'Cipher · Systems Investigator',
      response: 'Segment failures by endpoint, dependency, and deploy wave. Reproduce one failing request with trace data, check saturation and downstream errors, and test the leading hypothesis in a small canary.',
    },
    {
      id: 'D',
      name: 'Delta · Communications Lead',
      response: 'Declare the incident, publish an internal status cadence, give support an approved customer message, track decisions in a timeline, and prepare a post-incident review once service is stable.',
    },
  ],
}

const DEMO_BASE_SCORES: Record<TaskId, number> = { A: 8.5, B: 8.38, C: 8.2, D: 8 }
const DEMO_POSITION_EFFECT = [0.6, 0.27, 0, -0.22] as const

/**
 * A transparent synthetic result set for the public static demo. The positional
 * boost deliberately creates order-sensitive outcomes; it is never presented as
 * a real model judgment.
 */
export const DEMO_VERDICTS: readonly AuditVerdict[] = HELIX_STATES.map((order, stateIndex) => {
  const scores = Object.fromEntries(TASK_IDS.map((agent) => {
    const position = order.indexOf(agent)
    return [agent, Number((DEMO_BASE_SCORES[agent] + DEMO_POSITION_EFFECT[position]).toFixed(2))]
  })) as Record<TaskId, number>

  const winner = TASK_IDS.reduce((best, agent) => scores[agent] > scores[best] ? agent : best)
  const winnerPosition = order.indexOf(winner)

  return {
    stateIndex,
    order,
    winner,
    winnerPosition,
    scores,
    reason: `Synthetic demo: ${winner} ranked highest after the visible position effect was applied.`,
  }
})
