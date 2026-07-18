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
  A: 'Company A',
  B: 'Company B',
  C: 'Company C',
  D: 'Company D',
}

const AUTO_INTERVAL_MS = 1100
const TIME_SLOTS = ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM'] as const

function App() {
  const [stateIndex, setStateIndex] = useState(0)
  const [previousIndex, setPreviousIndex] = useState<number | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [taskNames, setTaskNames] = useState<Record<TaskId, string>>(DEFAULT_NAMES)
  const [copyStatus, setCopyStatus] = useState('Copy 24-day schedule')

  const state = stateAt(stateIndex)
  const previousState = previousIndex === null ? null : stateAt(previousIndex)
  const swap = previousState ? adjacentSwapPositions(previousState, state) : null
  const arrangement = state.join('')

  const positions = useMemo(
    () => Object.fromEntries(state.map((task, position) => [task, position])) as Record<TaskId, number>,
    [state],
  )
  const isBalanced = TASK_IDS.every((task) => BALANCE_MATRIX[task].every((count) => count === 6))
  const rotationPlan = useMemo(
    () => formatRotationPlan(taskNames, HELIX_STATES, TIME_SLOTS),
    [taskNames],
  )

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
      window.setTimeout(() => setCopyStatus('Copy 24-day schedule'), 1800)
    } catch {
      setCopyStatus('Copy unavailable')
    }
  }

  const selectDay = (index: number) => {
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
          <div className="eyebrow"><span /> FAIR ROOM ACCESS, WITHOUT RANDOM IMBALANCE</div>
          <h1>Fair meeting times.<br /><em>Minimal disruption.</em></h1>
          <p className="lede">
            Helix creates a 24-day conference-room schedule for four companies sharing four daily time slots. Every company receives every slot six times, and only two neighboring bookings change between days.
          </p>
        </section>

        <section className="use-case-panel" aria-labelledby="use-case-title">
          <div className="use-case-copy">
            <p className="section-kicker">THE PRACTICAL USE CASE</p>
            <h2 id="use-case-title">Four companies. One conference room. Four daily time slots.</h2>
            <p>
              A random daily lineup can repeatedly give one company the earliest—or latest—meeting. Helix cycles through every booking order once, creating a complete and auditable allocation.
            </p>
          </div>
          <div className="use-case-example">
            <span>DAY {String(stateIndex + 1).padStart(2, '0')} · SHARED CONFERENCE ROOM</span>
            <ol>
              {state.map((company, position) => (
                <li key={company}><b>{TIME_SLOTS[position]}</b><span>{taskNames[company]}</span></li>
              ))}
            </ol>
            <p>Across 24 days, every company receives every time slot exactly six times.</p>
          </div>
        </section>

        <section id="scheduler" className="scheduler-panel" aria-labelledby="scheduler-title">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">LIVE TRAVERSAL</p>
              <h2 id="scheduler-title">Today&apos;s room schedule</h2>
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

          <div className="track" aria-label="Companies ordered by meeting time">
            {TASK_IDS.map((task) => (
              <article
                className={`task-card card-${task.toLowerCase()}`}
                key={task}
                style={{ '--position': positions[task] } as CSSProperties}
              >
                <span className="task-letter">{task}</span>
                <span className="position-label">SLOT {positions[task] + 1} · {TIME_SLOTS[positions[task]]}</span>
                <h3>{taskNames[task] || `Company ${task}`}</h3>
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
            <h2>Rename companies</h2>
            <div className="rename-fields">
              {TASK_IDS.map((task) => (
                <label key={task}>
                  <span>{task}</span>
                  <input
                    value={taskNames[task]}
                    maxLength={28}
                    aria-label={`Name for company ${task}`}
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
                <h2>Meeting-slot balance</h2>
              </div>
              <span className="verified-badge">{isBalanced ? '✓ VERIFIED' : '! CHECK NEEDED'}</span>
            </div>
            <p>Across all {HELIX_STATES.length} days, each company receives each meeting time exactly six times.</p>
            <div className="matrix-wrap">
              <table>
                <caption className="sr-only">Meeting-time counts for every company across the complete cycle</caption>
                <thead><tr><th>COMPANY</th>{['9AM', '11AM', '1PM', '3PM'].map((time) => <th key={time}>{time}</th>)}</tr></thead>
                <tbody>
                  {TASK_IDS.map((task) => (
                    <tr key={task}>
                      <th><span className={`matrix-dot dot-${task.toLowerCase()}`} />{taskNames[task]}</th>
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
                <li>Companies can repeatedly land in early or late slots</li>
                <li>Several bookings may change at once</li>
              </ul>
            </article>
            <article className="comparison-card helix-card">
              <span>THE HELIX CYCLE</span>
              <h3>Every booking day is accounted for</h3>
              <ul>
                <li>All 24 unique orders appear exactly once</li>
                <li>Each company gets each time exactly six times</li>
                <li>Only two neighboring bookings swap each day</li>
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
              <h2 id="rotation-title">Your complete 24-day room schedule</h2>
              <p>Each row is one booking day. Select a day to inspect its time-slot allocation above.</p>
            </div>
            <button className="copy-button" onClick={copyRotationPlan}>{copyStatus}</button>
          </div>
          <div className="round-grid">
            {HELIX_STATES.map((round, index) => (
              <button
                className={`round-card${stateIndex === index ? ' is-current' : ''}`}
                key={index}
                onClick={() => selectDay(index)}
                aria-label={`Select day ${index + 1}: ${round.map((task) => taskNames[task]).join(', ')}`}
                aria-pressed={stateIndex === index}
              >
                <span>DAY {String(index + 1).padStart(2, '0')}</span>
                <strong>{round.join('')}</strong>
                <small>{round.map((task, position) => `${TIME_SLOTS[position]} ${taskNames[task]}`).join(' · ')}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="properties">
          <p className="section-kicker">THE MECHANISM</p>
          <h2>Small moves. Complete coverage.</h2>
          <div className="property-list">
            <article><strong>24</strong><div><h3>Unique states</h3><p>Every permutation appears exactly once.</p></div></article>
            <article><strong>01</strong><div><h3>Adjacent swap</h3><p>Only two companies trade neighboring time slots each day.</p></div></article>
            <article><strong>06×</strong><div><h3>Equal time access</h3><p>Each company receives every meeting time six times.</p></div></article>
          </div>
        </section>
      </main>

      <footer>
        <span>HELIX SCHEDULER</span>
        <p>Experimental balanced room rotation · Fault-tolerant scheduling demonstration</p>
      </footer>
    </div>
  )
}

export default App
