# Helix Scheduler · Agent Order Lab

Helix Scheduler is an interactive order-bias audit for four AI agent responses. It presents the same responses to a judge in all 24 possible orders, using a fixed cyclic traversal in which every response appears in every position six times and each new order differs by one adjacent swap.

The question is deliberately simple:

> Does the judge still choose the same answer when nothing changes except presentation order?

Helix is an **experimental symmetry-derived, balanced traversal and fault-tolerant scheduling demonstration**. It does not eliminate model bias, prove that a response is objectively best, or claim universal scheduling optimality.

## Live demo

Open the public [Helix Agent Order Lab on GitHub Pages](https://wimmerb86-crypto.github.io/helix-scheduler/).

The GitHub Pages build includes a transparent synthetic audit, so the complete interface works without credentials or API cost. Paid model judging is deliberately absent from the public site; the repository includes a separate access-code-protected path for a private Build Week deployment.

## What the lab does

1. Accepts one task, one judging rubric, and four named agent responses.
2. Keeps the responses fixed while presenting them in the exact 24-state Helix order.
3. Uses anonymous `Response 1`–`Response 4` labels so stable A–D identities are not exposed to the judge.
4. Records the winner, four scores, and a short rubric-based reason for every order.
5. Displays total wins, leading-winner agreement, winner changes across adjacent swaps, and a candidate-by-position win matrix.
6. Keeps the mathematical balance matrix separate from the model results, making both auditable.

The synthetic mode deliberately applies a visible positional effect. It demonstrates how the audit detects order sensitivity; it is not presented as an AI judgment of the sample text.

## Why a fixed cycle instead of random order?

Independent random shuffles provide variety but do not guarantee complete coverage or equal position exposure over a fixed number of runs. Shuffling all 24 permutations without replacement can guarantee coverage, but Helix also provides:

- a deterministic and replayable audit trail;
- exactly six appearances for each response in each position;
- one adjacent swap between consecutive states, including the final return to `ABCD`; and
- a simple local comparison: when the winner changes after one neighboring pair swaps, the transition is easy to inspect.

These properties make Helix useful as a diagnostic structure. They do not guarantee that the judge itself is unbiased or deterministic.

## Quick start

Requirements: Node.js 20.19 or newer.

```bash
npm install
npm run dev
```

Open the local address printed by Vite. Run the complete verification suite with:

```bash
npm test
npm run build
```

The production build creates `dist/` and type-checks both the React application and the optional API function.

## Private Build Week judge

The public GitHub Pages demo stays synthetic and makes no paid API calls. A separate private deployment can enable the real judge for Build Week reviewers. The browser never receives the OpenAI API key: the Vercel-compatible function in `api/audit.ts` reads it only on the server and verifies a private judge access code before starting an audit.

Copy `.env.example` into the private deployment's environment settings and configure at least:

```text
OPENAI_API_KEY=your_server_side_secret
AUDIT_ACCESS_CODE=a_long_private_judge_code
OPENAI_MODEL=gpt-5.6-luna
OPENAI_REASONING_EFFORT=none
AUDIT_MAX_RUNS_PER_HOUR=2
AUDIT_MAX_ACCESS_ATTEMPTS_PER_HOUR=10
JUDGE_CONCURRENCY=4
```

`OPENAI_MODEL` defaults to the lower-cost `gpt-5.6-luna` tier. Never prefix either secret with `VITE_`, place it in frontend code, or commit it. Share the private deployment URL and access code only with the judges, use the same protected deployment for the video capture, and revoke the API key after judging.

When the frontend and function share one private `*.vercel.app` deployment, the app automatically uses `/api/audit`. If a separate protected frontend is required, set `ALLOWED_ORIGINS` on the server and this build-time value on that frontend:

```text
VITE_AUDIT_API_URL=https://your-private-api.example/api/audit
```

Do not set `VITE_AUDIT_API_URL` in the public GitHub Pages build. Without it, paid judging is hidden and the sample audit remains fully interactive.

The endpoint caps the task and rubric at 500 characters, each response at 1,000 characters, judge reasons at 20 words, and model output at 120 tokens per permutation. It permits two successful audit starts per IP per hour by default, separately limits invalid access attempts, disables response storage, and publishes results only if all 24 judgments finish. It deliberately does not retry entire audits.

The access code and process-local rate limiter are appropriate for a short, judge-only demonstration, not a public commercial service. A broader release would need user accounts, durable distributed rate limits, monitoring, hard account budgets, and a deliberate billing design.

## Architecture

The project stays intentionally small enough for a three-day build:

- **React + TypeScript + Vite** renders the responsive static application.
- **`src/traversal.ts`** is the explicit mathematical source of truth: the required state sequence, cyclic index wrapping, adjacent-swap verification, and positional balance matrix.
- **`src/audit.ts`** defines audit inputs and verdicts, validates complete cycles, derives metrics, and supplies the transparent sample fixture.
- **`src/App.tsx`** owns presentation state, editable inputs, navigation, auto-run, sample/live result selection, and the responsive dashboards.
- **`api/audit.ts`** is the private, server-only OpenAI integration. It uses the Responses API with GPT-5.6 Luna structured outputs, verifies the judge access code, applies cost controls, and never sends A–D identities to the model.
- **Vitest** verifies the traversal and audit aggregation independently of the interface.

The data flow is one-way: the fixed traversal determines each presentation order, verdicts map judge-visible positions back to stable identities, and the summary is derived from the complete set. UI changes cannot alter the mathematical cycle.

## Mathematical properties

The supplied sequence is a cyclic adjacent-transposition ordering of the symmetric group on four elements:

- It contains `4! = 24` states.
- Every state is a distinct permutation of A, B, C, and D.
- Consecutive states differ by one swap of neighboring entries.
- State 23 (`BACD`) returns to state 0 (`ABCD`) by swapping the first two entries.
- Every identity occurs in each of the four positions exactly `24 / 4 = 6` times.

The exact sequence is stored explicitly rather than generated at runtime, making it easy to compare the implementation with the Build Week specification.

## Audit metrics

- **Wins by candidate:** how many of the 24 orders each response won.
- **Top-winner agreement:** the leading candidate's wins divided by 24. This is outcome consistency, not calibrated model confidence.
- **Winner changes:** how often the selected winner changes across all 24 adjacent-swap transitions, including the cycle closure.
- **Position win matrix:** for each candidate, wins while displayed in position 1, 2, 3, or 4. Each cell has six possible exposures.
- **Average score:** the mean judge score for each stable candidate across the complete cycle; calculated by the engine and available for further analysis.

These descriptive measurements can reveal order sensitivity. They cannot identify its cause on their own, and repeated live audits may differ because model inference is not perfectly deterministic.

## Testing

Run:

```bash
npm test
```

The traversal suite verifies:

1. the exact specified sequence;
2. exactly 24 unique states;
3. every state is a permutation of `ABCD`;
4. every forward transition is one adjacent swap;
5. the final state connects back to `ABCD` by one adjacent swap; and
6. every task occupies every position exactly six times.

The audit suite additionally verifies:

1. exactly one verdict is required for every Helix state;
2. wins are attributed to the correct candidate and displayed position;
3. winner changes include the closing transition;
4. incomplete or mismatched result cycles are rejected; and
5. a run requires one task, one rubric, and the four A–D responses exactly once.

## Limitations

- The engine handles exactly four items and the specified fixed cycle.
- Helix measures presentation-order sensitivity; it does not remove bias from the judge or guarantee factual correctness.
- A complete live audit makes 24 independent model calls and therefore has real latency and API cost.
- Live results can vary across repeated audits even when inputs are unchanged.
- The judge access code and process-local rate limiter are temporary demonstration controls, not production authentication or metering.
- GPT-5.6 Luna, compact outputs, and no-reasoning mode reduce cost; they do not impose a hard dollar cap on the OpenAI account.
- Candidate text can contain adversarial instructions. The judge prompt treats responses as untrusted material, but prompt-injection resistance is not guaranteed.
- No response text is intentionally persisted by Helix, but operators must still review their hosting and API data-handling requirements.
- Other mappings—such as shared meeting slots, software test orders, presentations, and study sequences—must ensure that all 24 orders are actually valid for their domain.

## Development history

- **July 18, 2026 · Mathematical foundation:** encoded the exact 24-state cyclic traversal and its independently testable invariants.
- **July 18, 2026 · Working scheduler:** added previous/next, auto-run, pause, reset, renaming, adjacent-swap animation, and the derived balance matrix.
- **July 18, 2026 · Public demonstration:** published the responsive static experience on GitHub Pages and clarified the shared-room schedule as one possible mapping.
- **July 18, 2026 · Agent Order Lab:** reframed the project as an AI judge order-sensitivity audit, added editable responses, a complete sample result set, win analytics, position analytics, and order-by-order verdict inspection.
- **July 18, 2026 · OpenAI integration:** added an optional server-only GPT-5.6 Responses API function with structured verdicts, batching, input limits, origin checks, and demo rate limiting.
- **July 18, 2026 · Private judge controls:** moved live audits behind a server-verified access code, selected GPT-5.6 Luna by default, tightened input and output limits, separated access-attempt and audit-run limits, and kept the public Pages demo free of paid calls.

The project prioritizes an explainable mathematical core, a working no-credential demonstration, and a narrow path to real model evaluation before adding broader multi-agent orchestration features.
