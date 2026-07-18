export const TASK_IDS = ['A', 'B', 'C', 'D'] as const

export type TaskId = (typeof TASK_IDS)[number]
export type HelixState = readonly [TaskId, TaskId, TaskId, TaskId]
export type BalanceMatrix = Record<TaskId, readonly [number, number, number, number]>

/**
 * A cyclic adjacent-transposition traversal of all 4! task arrangements.
 * Keep this list explicit: it is the specification and single source of truth.
 */
export const HELIX_STATES: readonly HelixState[] = [
  ['A', 'B', 'C', 'D'],
  ['A', 'B', 'D', 'C'],
  ['A', 'D', 'B', 'C'],
  ['D', 'A', 'B', 'C'],
  ['D', 'A', 'C', 'B'],
  ['A', 'D', 'C', 'B'],
  ['A', 'C', 'D', 'B'],
  ['A', 'C', 'B', 'D'],
  ['C', 'A', 'B', 'D'],
  ['C', 'A', 'D', 'B'],
  ['C', 'D', 'A', 'B'],
  ['D', 'C', 'A', 'B'],
  ['D', 'C', 'B', 'A'],
  ['C', 'D', 'B', 'A'],
  ['C', 'B', 'D', 'A'],
  ['C', 'B', 'A', 'D'],
  ['B', 'C', 'A', 'D'],
  ['B', 'C', 'D', 'A'],
  ['B', 'D', 'C', 'A'],
  ['D', 'B', 'C', 'A'],
  ['D', 'B', 'A', 'C'],
  ['B', 'D', 'A', 'C'],
  ['B', 'A', 'D', 'C'],
  ['B', 'A', 'C', 'D'],
] as const

export function wrapStateIndex(index: number): number {
  return ((index % HELIX_STATES.length) + HELIX_STATES.length) % HELIX_STATES.length
}

export function stateAt(index: number): HelixState {
  return HELIX_STATES[wrapStateIndex(index)]
}

export function adjacentSwapPositions(from: HelixState, to: HelixState): readonly [number, number] | null {
  const changed = from
    .map((task, position) => (task === to[position] ? -1 : position))
    .filter((position) => position !== -1)

  if (
    changed.length !== 2 ||
    changed[1] !== changed[0] + 1 ||
    from[changed[0]] !== to[changed[1]] ||
    from[changed[1]] !== to[changed[0]]
  ) {
    return null
  }

  return [changed[0], changed[1]]
}

export function calculateBalanceMatrix(states: readonly HelixState[] = HELIX_STATES): BalanceMatrix {
  const matrix: Record<TaskId, [number, number, number, number]> = {
    A: [0, 0, 0, 0],
    B: [0, 0, 0, 0],
    C: [0, 0, 0, 0],
    D: [0, 0, 0, 0],
  }

  states.forEach((state) => {
    state.forEach((task, position) => {
      matrix[task][position] += 1
    })
  })

  return matrix
}

export const BALANCE_MATRIX = calculateBalanceMatrix()

export function formatRotationPlan(
  taskNames: Readonly<Record<TaskId, string>>,
  states: readonly HelixState[] = HELIX_STATES,
  positionLabels?: readonly [string, string, string, string],
): string {
  return states
    .map((state, index) => {
      const day = String(index + 1).padStart(2, '0')
      const schedule = state.map((task, position) => (
        positionLabels ? `${positionLabels[position]} ${taskNames[task]}` : taskNames[task]
      ))
      return `Day ${day}: ${schedule.join(positionLabels ? ' | ' : ' -> ')}`
    })
    .join('\n')
}
