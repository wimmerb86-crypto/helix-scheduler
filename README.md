# Helix Scheduler

Helix Scheduler is a balanced meeting-slot planner for four companies that share one conference room with four daily time slots. It turns a complete cyclic traversal of all 24 booking orders into an interactive, copyable 24-day schedule.

It is an **experimental symmetry-derived, balanced traversal and fault-tolerant scheduling demonstration**—not a claim of universal scheduling optimality.

## Live demo

Open [Helix Scheduler on GitHub Pages](https://wimmerb86-crypto.github.io/helix-scheduler/).

## Where Helix is useful

Imagine four companies sharing one conference room at 9:00 AM, 11:00 AM, 1:00 PM, and 3:00 PM. An uncontrolled random schedule can repeatedly give one company the most desirable time. Helix schedules all 24 possible daily booking orders so every company receives every time slot exactly six times.

Across one 24-day cycle:

- every possible ordering appears exactly once;
- every company receives every meeting time exactly six times; and
- each new day changes only one neighboring pair, so two companies move by one slot while the other two keep their times.

Independent random selection cannot guarantee those properties over a fixed number of days. Randomly shuffling all 24 states without replacement can provide complete coverage, but Helix also provides minimal adjacent changes, a deterministic audit trail, and a closed cycle that can be paused, reversed, and repeated.

## Quick start

Requirements: Node.js 20.19 or newer.

```bash
npm install
npm run dev
```

Open the local address printed by Vite. For a production bundle:

```bash
npm run build
npm run test
```

The generated `dist/` directory is a static site and can be deployed to Vercel, Netlify, Cloudflare Pages, GitHub Pages, or any static host. Use `npm run build` as the build command and `dist` as the output directory.

## Architecture

The deliberately small architecture is suitable for a three-day build:

- **React + TypeScript + Vite** provides a fast static application with no backend or persistent data.
- **`src/traversal.ts`** is the auditable source of truth. It stores the required cycle, wraps indexes, identifies adjacent swaps, and calculates the positional balance matrix.
- **`src/App.tsx`** owns only presentation state: current/previous cycle indexes, auto-run status, and user-editable task labels.
- **CSS position transforms** animate cards. Because each valid transition swaps adjacent items, exactly two cards exchange positions per step.
- **Vitest** checks the mathematical invariants independently of the UI.

The traversal is data-first: visual changes cannot alter its mathematical properties. Task renaming changes labels only; the stable A–D identities remain intact.

## Mathematical properties

The supplied sequence is a cyclic adjacent-transposition ordering of the symmetric group on four elements:

- It has `4! = 24` states.
- Every state is a distinct permutation of A, B, C, and D.
- Consecutive states differ by one swap of neighboring entries.
- State 23 (`BACD`) returns to state 0 (`ABCD`) by swapping the first two entries.
- Across the complete cycle, every task occurs in each of the four positions exactly `24 / 4 = 6` times.

The interface derives the balance matrix from the cycle at runtime rather than hard-coding its displayed values.

## Testing

Run the invariant suite with:

```bash
npm test
```

The tests verify:

1. exactly 24 unique states;
2. every state is a permutation of `ABCD`;
3. every forward transition is exactly one adjacent swap;
4. the last state connects back to `ABCD` by one adjacent swap; and
5. each task occupies each position exactly six times.

## Limitations

- The MVP handles exactly four companies, four time slots, and the specified fixed cycle.
- Company names live only in current browser memory and reset on refresh.
- Auto-run uses a fixed interval and does not model variable meeting durations, conflicts, availability, or room capacity.
- Positional balance is one fairness property; it does not imply optimality for every workload or objective.

## Build Week development history

- **July 18, 2026 - Mathematical foundation:** selected the static architecture, encoded the exact 24-state cycle, and implemented the independently testable traversal helpers.
- **July 18, 2026 - Working MVP:** added navigation, cycle wrapping, auto-run/pause/reset, task renaming, adjacent-swap animation, and the derived balance matrix.
- **July 18, 2026 - Verification:** all six invariant tests passed and the TypeScript/Vite production build completed successfully.
- **Next:** deploy the static build, record the demo, and prepare the Devpost submission materials.

The project intentionally prioritizes a small, explainable core before visual refinement - a useful shape for rapid prototyping and reliable judging.
