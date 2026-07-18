import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  AUDIT_INPUT_LIMITS,
  DEMO_REQUEST,
  DEMO_VERDICTS,
  summarizeAudit,
  validateAuditRequest,
  type AuditRequest,
  type AuditVerdict,
} from './audit'
import {
  BALANCE_MATRIX,
  HELIX_STATES,
  TASK_IDS,
  type TaskId,
  adjacentSwapPositions,
  stateAt,
  wrapStateIndex,
} from './traversal'

const AUTO_INTERVAL_MS = 1100
const LIVE_AUDIT_ENDPOINT = import.meta.env.VITE_AUDIT_API_URL?.trim()
  ?? (window.location.hostname.endsWith('.vercel.app') ? '/api/audit' : '')

type AuditMode = 'demo' | 'live'

function copyDemoRequest(): AuditRequest {
  return {
    ...DEMO_REQUEST,
    agents: DEMO_REQUEST.agents.map((agent) => ({ ...agent })),
  }
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function App() {
  const [stateIndex, setStateIndex] = useState(0)
  const [previousIndex, setPreviousIndex] = useState<number | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [auditRequest, setAuditRequest] = useState<AuditRequest>(copyDemoRequest)
  const [verdicts, setVerdicts] = useState<readonly AuditVerdict[]>(DEMO_VERDICTS)
  const [auditMode, setAuditMode] = useState<AuditMode>('demo')
  const [liveModel, setLiveModel] = useState('gpt-5.6-luna')
  const [accessCode, setAccessCode] = useState('')
  const [isAuditing, setIsAuditing] = useState(false)
  const [auditMessage, setAuditMessage] = useState('Showing a transparent synthetic audit so the full experience works without an API key.')

  const state = stateAt(stateIndex)
  const previousState = previousIndex === null ? null : stateAt(previousIndex)
  const swap = previousState ? adjacentSwapPositions(previousState, state) : null
  const arrangement = state.join('')
  const summary = useMemo(() => summarizeAudit(verdicts), [verdicts])
  const activeVerdict = verdicts.find((verdict) => verdict.stateIndex === stateIndex) ?? verdicts[0]
  const agentNames = useMemo(() => Object.fromEntries(
    auditRequest.agents.map((agent) => [agent.id, agent.name || `Agent ${agent.id}`]),
  ) as Record<TaskId, string>, [auditRequest.agents])
  const positions = useMemo(
    () => Object.fromEntries(state.map((agent, position) => [agent, position])) as Record<TaskId, number>,
    [state],
  )
  const isBalanced = TASK_IDS.every((agent) => BALANCE_MATRIX[agent].every((count) => count === 6))

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

  const updateRequestField = (field: 'task' | 'rubric', value: string) => {
    setAuditRequest((current) => ({ ...current, [field]: value }))
  }

  const updateAgent = (id: TaskId, field: 'name' | 'response', value: string) => {
    setAuditRequest((current) => ({
      ...current,
      agents: current.agents.map((agent) => agent.id === id ? { ...agent, [field]: value } : agent),
    }))
  }

  const loadDemo = () => {
    setAuditRequest(copyDemoRequest())
    setVerdicts(DEMO_VERDICTS)
    setAuditMode('demo')
    setAccessCode('')
    setAuditMessage('Sample restored. Its visible position effect is synthetic and does not judge the response text.')
    setIsRunning(false)
    setPreviousIndex(null)
    setStateIndex(0)
  }

  const runLiveAudit = async () => {
    const errors = validateAuditRequest(auditRequest)
    if (errors.length > 0) {
      setAuditMessage(errors[0])
      return
    }
    if (!LIVE_AUDIT_ENDPOINT) {
      setAuditMessage('The secure GPT judge is not connected on this static deployment. The sample audit remains fully interactive.')
      return
    }
    if (!accessCode.trim()) {
      setAuditMessage('Enter the private judge access code before starting a paid audit.')
      return
    }

    setIsAuditing(true)
    setAuditMessage('Running 24 independent judgments. The task, rubric, and responses stay fixed while only their order changes.')
    try {
      const response = await fetch(LIVE_AUDIT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...auditRequest, accessCode }),
      })
      const payload = await response.json() as { verdicts?: AuditVerdict[]; model?: string; error?: string }
      if (!response.ok || !payload.verdicts) throw new Error(payload.error || 'The audit endpoint returned an incomplete result.')

      summarizeAudit(payload.verdicts)
      setVerdicts(payload.verdicts)
      setAuditMode('live')
      setLiveModel(payload.model ?? 'gpt-5.6-luna')
      setAccessCode('')
      setAuditMessage(`${payload.model ?? 'gpt-5.6-luna'} completed all 24 order-balanced judgments.`)
      setPreviousIndex(null)
      setStateIndex(0)
    } catch (error) {
      setAuditMessage(error instanceof Error ? error.message : 'The GPT audit could not be completed.')
    } finally {
      setIsAuditing(false)
    }
  }

  const inspectVerdict = (index: number) => {
    goTo(index)
    document.getElementById('verdict-detail')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const resetTraversal = () => {
    setIsRunning(false)
    setPreviousIndex(null)
    setStateIndex(0)
  }

  const leadingName = summary.leadingAgent ? agentNames[summary.leadingAgent] : 'Tie'

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Helix Scheduler home">
          <span className="brand-mark" aria-hidden="true"><i /><i /></span>
          <span>HELIX</span>
        </a>
        <nav aria-label="Page sections">
          <a href="#lab">Agent Order Lab</a>
          <a href="#traversal">Traversal</a>
        </nav>
        <span className="build-label">OPENAI BUILD WEEK</span>
      </header>

      <main id="top">
        <section className="hero">
          <div className="eyebrow"><span /> AGENT ORDER LAB</div>
          <h1>Same answers.<br /><em>Every order.</em></h1>
          <p className="lede">
            Does an AI judge still choose the same answer when nothing changes except presentation order? Helix audits four agent responses across all 24 permutations, with equal position exposure and one adjacent swap between runs.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="#lab">Explore the audit</a>
            <span>24 orders · 6 appearances per position · 1 swap per step</span>
          </div>
        </section>

        <section className="story-strip" aria-label="Agent Order Lab workflow">
          <article><span>01</span><div><strong>Collect</strong><p>Four candidate responses to one task.</p></div></article>
          <article><span>02</span><div><strong>Rotate</strong><p>Present them in every possible order.</p></div></article>
          <article><span>03</span><div><strong>Audit</strong><p>Measure winner stability and position effects.</p></div></article>
        </section>

        <section id="lab" className="lab-section" aria-labelledby="lab-title">
          <div className="section-heading lab-heading">
            <div>
              <p className="section-kicker">WORKING AGENT ORDER LAB</p>
              <h2 id="lab-title">Test a judge for order sensitivity</h2>
              <p>Agent identities are tracked internally. The judge sees anonymous Response 1–4 labels in the selected Helix order.</p>
            </div>
            <span className={`mode-badge mode-${auditMode}`}>{auditMode === 'live' ? `${liveModel.toUpperCase()} AUDIT` : 'SYNTHETIC DEMO'}</span>
          </div>

          <div className="lab-form">
            <label className="wide-field">
              <span>TASK GIVEN TO ALL FOUR AGENTS</span>
              <textarea value={auditRequest.task} maxLength={AUDIT_INPUT_LIMITS.task} rows={3} onChange={(event) => updateRequestField('task', event.target.value)} />
            </label>
            <label className="wide-field">
              <span>JUDGING RUBRIC</span>
              <textarea value={auditRequest.rubric} maxLength={AUDIT_INPUT_LIMITS.rubric} rows={3} onChange={(event) => updateRequestField('rubric', event.target.value)} />
            </label>

            <div className="agent-response-grid">
              {auditRequest.agents.map((agent) => (
                <label className={`agent-response agent-${agent.id.toLowerCase()}`} key={agent.id}>
                  <span className="agent-response-heading"><b>{agent.id}</b><small>CANDIDATE RESPONSE</small></span>
                  <input value={agent.name} maxLength={AUDIT_INPUT_LIMITS.agentName} aria-label={`Name for agent ${agent.id}`} onChange={(event) => updateAgent(agent.id, 'name', event.target.value)} />
                  <textarea value={agent.response} maxLength={AUDIT_INPUT_LIMITS.agentResponse} rows={8} aria-label={`Response from agent ${agent.id}`} onChange={(event) => updateAgent(agent.id, 'response', event.target.value)} />
                </label>
              ))}
            </div>

            <div className="lab-actions">
              {LIVE_AUDIT_ENDPOINT ? (
                <div className="private-run-controls">
                  <label className="judge-code-field">
                    <span>PRIVATE JUDGE ACCESS CODE</span>
                    <input type="password" value={accessCode} minLength={8} maxLength={128} autoComplete="off" onChange={(event) => setAccessCode(event.target.value)} />
                  </label>
                  <button className="primary-button" onClick={runLiveAudit} disabled={isAuditing}>
                    {isAuditing ? 'Running 24 judgments…' : 'Run private Luna audit'}
                  </button>
                </div>
              ) : (
                <div className="public-mode-note"><strong>PUBLIC DEMO MODE</strong><span>Paid GPT judging is disabled here. Judges receive a separate protected deployment.</span></div>
              )}
              <button className="secondary-button" onClick={loadDemo}>Restore sample</button>
              <p aria-live="polite">{auditMessage}</p>
            </div>
          </div>

          <div className="results-panel" aria-labelledby="results-title">
            <div className="results-heading">
              <div><p className="section-kicker">AUDIT OUTPUT</p><h2 id="results-title">What changed when order changed?</h2></div>
              <span>{summary.totalEvaluations}/24 COMPLETE</span>
            </div>

            <div className="metric-grid">
              <article><span>LEADING CANDIDATE</span><strong>{summary.leadingAgent ?? 'TIE'}</strong><p>{leadingName} · {summary.leadingWinCount} wins</p></article>
              <article><span>TOP-WINNER AGREEMENT</span><strong>{formatPercent(summary.leadingAgreementRate)}</strong><p>Share of runs won by the leader</p></article>
              <article><span>WINNER CHANGES</span><strong>{summary.winnerFlipCount}</strong><p>Across 24 one-swap transitions</p></article>
              <article><span>UNIQUE WINNERS</span><strong>{summary.uniqueWinners}</strong><p>{summary.isOrderSensitive ? 'Ordering affected the outcome' : 'One winner across every order'}</p></article>
            </div>

            <div className="audit-results-grid">
              <div className="win-board">
                <h3>Wins by candidate</h3>
                {TASK_IDS.map((agent) => (
                  <div className="win-row" key={agent}>
                    <span className={`candidate-key key-${agent.toLowerCase()}`}>{agent}</span>
                    <div><b>{agentNames[agent]}</b><i style={{ '--wins': summary.winCounts[agent] } as CSSProperties} /></div>
                    <strong>{summary.winCounts[agent]}</strong>
                  </div>
                ))}
              </div>

              <div className="position-board">
                <h3>Wins by presentation position</h3>
                <div className="matrix-wrap">
                  <table>
                    <caption className="sr-only">Candidate wins while shown in each presentation position</caption>
                    <thead><tr><th>AGENT</th>{[1, 2, 3, 4].map((position) => <th key={position}>P{position}</th>)}</tr></thead>
                    <tbody>{TASK_IDS.map((agent) => (
                      <tr key={agent}><th><span className={`matrix-dot dot-${agent.toLowerCase()}`} />{agent}</th>{summary.positionWinMatrix[agent].map((wins, position) => <td key={position}><strong>{wins}</strong><small>/6</small></td>)}</tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            </div>

            <div id="verdict-detail" className="verdict-detail">
              <div className="verdict-copy">
                <span>STATE {String(activeVerdict.stateIndex).padStart(2, '0')} · {activeVerdict.order.join('')}</span>
                <h3>{activeVerdict.winner} won this ordering</h3>
                <p>{activeVerdict.reason}</p>
              </div>
              <ol>
                {activeVerdict.order.map((agent, position) => (
                  <li className={activeVerdict.winner === agent ? 'is-winner' : ''} key={agent}>
                    <span>{position + 1}</span><b>{agent}</b><small>{activeVerdict.scores[agent].toFixed(2)}</small>
                  </li>
                ))}
              </ol>
            </div>

            <div className="verdict-grid" aria-label="All 24 audit verdicts">
              {verdicts.map((verdict) => (
                <button className={`${stateIndex === verdict.stateIndex ? 'is-current' : ''} winner-${verdict.winner.toLowerCase()}`} key={verdict.stateIndex} onClick={() => inspectVerdict(verdict.stateIndex)} aria-pressed={stateIndex === verdict.stateIndex}>
                  <span>{String(verdict.stateIndex).padStart(2, '0')}</span><b>{verdict.order.join('')}</b><small>{verdict.winner} WON</small>
                </button>
              ))}
            </div>
            <p className="results-caveat">This is an order-bias diagnostic, not proof that a response is objectively best. The synthetic demo deliberately models a position effect; live results may also vary between repeated model calls.</p>
          </div>
        </section>

        <section id="traversal" className="scheduler-panel" aria-labelledby="scheduler-title">
          <div className="panel-heading">
            <div><p className="section-kicker">TRAVERSAL INSPECTOR</p><h2 id="scheduler-title">One adjacent swap at a time</h2></div>
            <div className="state-readout" aria-live="polite"><span>STATE</span><strong>{String(stateIndex).padStart(2, '0')}</strong><span className="state-total">/ 23</span></div>
          </div>

          <div className="arrangement-code" aria-label={`Current arrangement: ${arrangement}`}>
            {state.map((agent, position) => <span key={agent} className={swap?.includes(position) ? 'is-swapped' : ''}>{agent}</span>)}
          </div>

          <div className="track" aria-label="Agent responses in current presentation order">
            {TASK_IDS.map((agent) => (
              <article className={`task-card card-${agent.toLowerCase()}`} key={agent} style={{ '--position': positions[agent] } as CSSProperties}>
                <span className="task-letter">{agent}</span>
                <span className="position-label">PRESENTED {positions[agent] + 1}</span>
                <h3>{agentNames[agent]}</h3>
                <span className="drag-line" aria-hidden="true" />
              </article>
            ))}
          </div>

          <div className="controls" aria-label="Traversal controls">
            <button className="icon-button" onClick={() => goTo(stateIndex - 1)} aria-label="Previous state">←</button>
            {isRunning ? <button className="primary-button" onClick={() => setIsRunning(false)}><span>Ⅱ</span> Pause</button> : <button className="primary-button" onClick={() => setIsRunning(true)}><span>▶</span> Auto-run</button>}
            <button className="icon-button" onClick={() => goTo(stateIndex + 1)} aria-label="Next state">→</button>
            <button className="reset-button" onClick={resetTraversal}>↻ Reset</button>
          </div>
        </section>

        <section className="lower-grid">
          <div className="rename-panel">
            <p className="section-kicker">EDITABLE IDENTITIES</p>
            <h2>Rename the four agents</h2>
            <p>Names change for readability; stable A–D identities keep every audit comparable.</p>
            <div className="rename-fields">{TASK_IDS.map((agent) => (
              <label key={agent}><span>{agent}</span><input value={agentNames[agent]} maxLength={AUDIT_INPUT_LIMITS.agentName} aria-label={`Rename agent ${agent}`} onChange={(event) => updateAgent(agent, 'name', event.target.value)} /></label>
            ))}</div>
          </div>

          <div className="balance-panel">
            <div className="balance-heading"><div><p className="section-kicker">FULL-CYCLE PROOF</p><h2>Position exposure</h2></div><span className="verified-badge">{isBalanced ? '✓ VERIFIED' : '! CHECK NEEDED'}</span></div>
            <p>Across all {HELIX_STATES.length} judgments, every agent response appears in every presentation position exactly six times.</p>
            <div className="matrix-wrap"><table><caption className="sr-only">Presentation-position counts for every agent</caption><thead><tr><th>AGENT</th>{[1, 2, 3, 4].map((position) => <th key={position}>P{position}</th>)}</tr></thead><tbody>{TASK_IDS.map((agent) => (
              <tr key={agent}><th><span className={`matrix-dot dot-${agent.toLowerCase()}`} />{agent}</th>{BALANCE_MATRIX[agent].map((count, position) => <td key={position}>{count}</td>)}</tr>
            ))}</tbody></table></div>
          </div>
        </section>

        <section className="use-case-panel" aria-labelledby="use-case-title">
          <div className="use-case-copy">
            <p className="section-kicker">THE TRAVERSAL IS GENERAL</p>
            <h2 id="use-case-title">Agent evaluation is one high-value use. The same balance pattern is reusable.</h2>
            <p>Helix applies whenever four valid items should receive complete, equal position exposure with small predictable transitions. It is an experimental symmetry-derived traversal—not a universally optimal scheduler.</p>
            <p className="use-case-applications"><strong>Other possible mappings</strong> shared-room time slots · software test orders · presentation order · counterbalanced study sequences · recurring role rotations</p>
          </div>
          <div className="use-case-example">
            <span>ONE CONCRETE NON-AI EXAMPLE</span>
            <h3>Four companies share one conference room and four daily slots.</h3>
            <ol>{['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM'].map((time, position) => <li key={time}><b>{time}</b><span>Company {state[position]}</span></li>)}</ol>
            <p>Over 24 days, every company receives every time slot exactly six times.</p>
          </div>
        </section>

        <section className="properties">
          <p className="section-kicker">WHY HELIX INSTEAD OF RANDOM ORDER?</p>
          <h2>Small moves. Complete coverage. An audit trail.</h2>
          <div className="property-list">
            <article><strong>24</strong><div><h3>Unique states</h3><p>Every possible ordering appears exactly once.</p></div></article>
            <article><strong>01</strong><div><h3>Adjacent swap</h3><p>Only two neighboring responses exchange positions per step.</p></div></article>
            <article><strong>06×</strong><div><h3>Positional balance</h3><p>Every response occupies every judge-visible position six times.</p></div></article>
          </div>
        </section>
      </main>

      <footer><span>HELIX SCHEDULER · AGENT ORDER LAB</span><p>Experimental symmetry-derived, balanced traversal and fault-tolerant scheduling demonstration</p></footer>
    </div>
  )
}

export default App
