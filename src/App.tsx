import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  BALANCE_MATRIX,
  HELIX_STATES,
  TASK_IDS,
  type TaskId,
  adjacentSwapPositions,
  formatRotationPlan,
  stateAt,
  wrapStateIndex,
} from './traversal'

const DEFAULT_NAMES: Record<TaskId, string> = {
  A: 'Safety',
  B: 'Equipment',
  C: 'Inventory',
  D: 'Documentation',
}

const AUTO_INTERVAL_MS = 1100

function App() {
  const [stateIndex, setStateIndex] = useState(0)
  const [previousIndex, setPreviousIndex] = useState<number | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [taskNames, setTaskNames] = useState<Record<TaskId, string>>(DEFAULT_NAMES)
  const [copyStatus, setCopyStatus] = useState('Copy 24-round plan')

  const state = stateAt(stateIndex)
  const previousState = previousIndex === null ? null : stateAt(previousIndex)
  const swap = previousState ? adjacentSwapPositions(previousState, state) : null
  const arrangement = state.join('')

  const positions = useMemo(
    () => Object.fromEntries(state.map((task, position) => [task, position])) as Record<TaskId, number>,
    [state],
  )
  const isBalanced = TASK_IDS.every((task) => BALANCE_MATRIX[task].every((count) => count === 6))
  const rotationPlan = useMemo(() => formatRotationPlan(taskNames), [taskNames])

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

  const copyRotationPlan = async () => {
    try {
      await navigator.clipboard.writeText(rotationPlan)
      setCopyStatus('Copied to clipboard')
      window.setTimeout(() => setCopyStatus('Copy 24-round plan'), 1800)
    } catch {
      setCopyStatus('Copy unavailable')
    }
  }

  const selectRound = (index: number) => {
    goTo(index)
    document.getElementById('scheduler')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
          <div className="eyebrow"><span /> FAIR ROTATIONS, WITHOUT RANDOM REPEATS</div>
          <h1>Fair turns.<br /><em>Minimal disruption.</em></h1>
          <p className="lede">
            Helix creates a 24-round plan for four recurring independent tasks. Every order appears once, every task gets every position six times, and only two neighbors change between rounds.
          </p>
        </section>

        <section className="use-case-panel" aria-labelledby="use-case-title">
          <div className="use-case-copy">
            <p className="section-kicker">THE PRACTICAL USE CASE</p>
            <h2 id="use-case-title">Repeat the same four tasks without always favoring the same one.</h2>
            <p>
              Use Helix when a team, tester, or researcher repeats four independent activities and the order can affect attention, effort, or results. It replaces uncontrolled random picks with a complete, auditable rotation.
            </p>
          </div>
          <div className="use-case-example">
            <span>EXAMPLE · DAILY OPERATIONS CHECKS</span>
            <ol>
              {TASK_IDS.map((task) => <li key={task}><b>{task}</b>{taskNames[task]}</li>)}
            </ol>
            <p>Across 24 rounds, no check is permanently first—or repeatedly left until last.</p>
          </div>
        </section>

        <section id="scheduler" className="scheduler-panel" aria-labelledby="scheduler-title">
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

        <section className="comparison" aria-labelledby="comparison-title">
          <div className="comparison-heading">
            <p className="section-kicker">WHY NOT JUST RANDOMIZE?</p>
            <h2 id="comparison-title">Random gives variety. Helix gives guarantees.</h2>
          </div>
          <div className="comparison-grid">
            <article className="comparison-card random-card">
              <span>INDEPENDENT RANDOM PICKS</span>
              <h3>Coverage is unpredictable</h3>
              <ul>
                <li>Orders can repeat before others appear</li>
                <li>Tasks can cluster in early or late positions</li>
                <li>Several positions may change at once</li>
              </ul>
            </article>
            <article className="comparison-card helix-card">
              <span>THE HELIX CYCLE</span>
              <h3>Every round is accounted for</h3>
              <ul>
                <li>All 24 unique orders appear exactly once</li>
                <li>Each task gets each position exactly six times</li>
                <li>Every round changes by one adjacent swap</li>
              </ul>
            </article>
          </div>
          <p className="comparison-note">
            A random shuffle without replacement can also cover all 24 orders. Helix additionally provides a fixed adjacent-swap path, a closed cycle, and a schedule that is easy to replay and audit.
          </p>
        </section>

        <section className="rotation-plan" aria-labelledby="rotation-title">
          <div className="rotation-heading">
            <div>
              <p className="section-kicker">A PLAN, NOT JUST A VISUALIZATION</p>
              <h2 id="rotation-title">Your complete 24-round rotation</h2>
              <p>Each row is one shift, meeting, test run, or study session. Select a round to inspect it above.</p>
            </div>
            <button className="copy-button" onClick={copyRotationPlan}>{copyStatus}</button>
          </div>
          <div className="round-grid">
            {HELIX_STATES.map((round, index) => (
              <button
                className={`round-card${stateIndex === index ? ' is-current' : ''}`}
                key={index}
                onClick={() => selectRound(index)}
                aria-label={`Select round ${index + 1}: ${round.map((task) => taskNames[task]).join(', ')}`}
                aria-pressed={stateIndex === index}
              >
                <span>ROUND {String(index + 1).padStart(2, '0')}</span>
                <strong>{round.join('')}</strong>
                <small>{round.map((task) => taskNames[task]).join(' · ')}</small>
              </button>
            ))}
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
