import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  BALANCE_MATRIX,
  HELIX_STATES,
  TASK_IDS,
  type TaskId,
  adjacentSwapPositions,
  stateAt,
  wrapStateIndex,
} from './traversal'

const DEFAULT_NAMES: Record<TaskId, string> = {
  A: 'Discover',
  B: 'Design',
  C: 'Build',
  D: 'Validate',
}

const AUTO_INTERVAL_MS = 1100

function App() {
  const [stateIndex, setStateIndex] = useState(0)
  const [previousIndex, setPreviousIndex] = useState<number | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [taskNames, setTaskNames] = useState<Record<TaskId, string>>(DEFAULT_NAMES)

  const state = stateAt(stateIndex)
  const previousState = previousIndex === null ? null : stateAt(previousIndex)
  const swap = previousState ? adjacentSwapPositions(previousState, state) : null
  const arrangement = state.join('')

  const positions = useMemo(
    () => Object.fromEntries(state.map((task, position) => [task, position])) as Record<TaskId, number>,
    [state],
  )
  const isBalanced = TASK_IDS.every((task) => BALANCE_MATRIX[task].every((count) => count === 6))

  const goTo = (nextIndex: number) => {
    setStateIndex((current) => {
      setPreviousIndex(current)
      return wrapStateIndex(nextIndex)
    })
  }

  useEffect(() => {
    if (!isRunning) return
    const timer = window.setInterval(() => {
      setStateIndex((current) => {
        setPreviousIndex(current)
        return wrapStateIndex(current + 1)
      })
    }, AUTO_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [isRunning])

  const reset = () => {
    setIsRunning(false)
    setPreviousIndex(null)
    setStateIndex(0)
    setTaskNames(DEFAULT_NAMES)
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Helix Scheduler home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
          </span>
          <span>HELIX</span>
        </a>
        <span className="build-label">OPENAI BUILD WEEK</span>
      </header>

      <main id="top">
        <section className="hero">
          <div className="eyebrow"><span /> BALANCED BY DESIGN</div>
          <h1>Every task.<br /><em>Every position.</em></h1>
          <p className="lede">
            An experimental, symmetry-derived traversal through all 24 ways to order four tasks—one adjacent swap at a time.
          </p>
        </section>

        <section className="scheduler-panel" aria-labelledby="scheduler-title">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">LIVE TRAVERSAL</p>
              <h2 id="scheduler-title">Current arrangement</h2>
            </div>
            <div className="state-readout" aria-live="polite">
              <span>STATE</span>
              <strong>{String(stateIndex).padStart(2, '0')}</strong>
              <span className="state-total">/ 23</span>
            </div>
          </div>

          <div className="arrangement-code" aria-label={`Current arrangement: ${arrangement}`}>
            {state.map((task, position) => (
              <span key={task} className={swap?.includes(position) ? 'is-swapped' : ''}>{task}</span>
            ))}
          </div>

          <div className="track" aria-label="Ordered task cards">
            {TASK_IDS.map((task) => (
              <article
                className={`task-card card-${task.toLowerCase()}`}
                key={task}
                style={{ '--position': positions[task] } as CSSProperties}
              >
                <span className="task-letter">{task}</span>
                <span className="position-label">POSITION {positions[task] + 1}</span>
                <h3>{taskNames[task] || `Task ${task}`}</h3>
                <span className="drag-line" aria-hidden="true" />
              </article>
            ))}
          </div>

          <div className="controls" aria-label="Traversal controls">
            <button className="icon-button" onClick={() => goTo(stateIndex - 1)} aria-label="Previous state">←</button>
            {isRunning ? (
              <button className="primary-button" onClick={() => setIsRunning(false)}><span>Ⅱ</span> Pause</button>
            ) : (
              <button className="primary-button" onClick={() => setIsRunning(true)}><span>▶</span> Auto-run</button>
            )}
            <button className="icon-button" onClick={() => goTo(stateIndex + 1)} aria-label="Next state">→</button>
            <button className="reset-button" onClick={reset}>↻ Reset</button>
          </div>
        </section>

        <section className="lower-grid">
          <div className="rename-panel">
            <p className="section-kicker">MAKE IT YOURS</p>
            <h2>Rename tasks</h2>
            <div className="rename-fields">
              {TASK_IDS.map((task) => (
                <label key={task}>
                  <span>{task}</span>
                  <input
                    value={taskNames[task]}
                    maxLength={28}
                    aria-label={`Name for task ${task}`}
                    onChange={(event) => setTaskNames({ ...taskNames, [task]: event.target.value })}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="balance-panel">
            <div className="balance-heading">
              <div>
                <p className="section-kicker">FULL-CYCLE PROOF</p>
                <h2>Positional balance</h2>
              </div>
              <span className="verified-badge">{isBalanced ? '✓ VERIFIED' : '! CHECK NEEDED'}</span>
            </div>
            <p>Across all {HELIX_STATES.length} states, each task occupies each position exactly six times.</p>
            <div className="matrix-wrap">
              <table>
                <caption className="sr-only">Position counts for every task across the complete cycle</caption>
                <thead><tr><th>TASK</th>{[1, 2, 3, 4].map((position) => <th key={position}>P{position}</th>)}</tr></thead>
                <tbody>
                  {TASK_IDS.map((task) => (
                    <tr key={task}>
                      <th><span className={`matrix-dot dot-${task.toLowerCase()}`} />{task}</th>
                      {BALANCE_MATRIX[task].map((count, position) => <td key={position}>{count}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="properties">
          <p className="section-kicker">THE MECHANISM</p>
          <h2>Small moves. Complete coverage.</h2>
          <div className="property-list">
            <article><strong>24</strong><div><h3>Unique states</h3><p>Every permutation appears exactly once.</p></div></article>
            <article><strong>01</strong><div><h3>Adjacent swap</h3><p>Each transition exchanges neighboring tasks.</p></div></article>
            <article><strong>06×</strong><div><h3>Perfect balance</h3><p>Each task visits every position six times.</p></div></article>
          </div>
        </section>
      </main>

      <footer>
        <span>HELIX SCHEDULER</span>
        <p>Experimental balanced traversal · Fault-tolerant scheduling demonstration</p>
      </footer>
    </div>
  )
}

export default App
