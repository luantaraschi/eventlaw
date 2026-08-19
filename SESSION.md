# Session handoff

Read this file first when resuming work in a new session.

## Objective

Validate `eventlaw`: one TypeScript law definition should support generated
tests, recorded-trace verification, and online monitoring while producing a
small, readable counterexample.

## Current phase

Vertical slices 1 through 3 are complete. The project is now validating
performance and API readability with external users.

## Current status

- Name checked and provisionally changed from `tracecheck` to `eventlaw`.
- Package is intentionally private and unpublished.
- Local Git repository initialized on `main`; private remote created at
  `https://github.com/luantaraschi/eventlaw` and linked as `origin`.
- Luan explicitly authorized Codex to create and push the initial commit as a
  one-time exception. Git identity is `Luan Taraschi`; the no-commit rule resumes
  immediately after that push.
- Semantic decisions and initial API are documented.
- Offline verifier implements progress, exclusion, and uniqueness laws.
- The published `lull` reducer is exercised as the first real integration.
- The same AST runs over an async stream through an incremental monitor that does
  not retain the complete trace.
- Online memory is classified per law: progress is `window-bounded`, exclusion
  is `scope-bounded`, and exact uniqueness is `unbounded`.
- Uniqueness retention is explicit: lifetime `forever`, inclusive sliding
  `.within(d)`, or per-partition `.resetOn(event)`.
- `monitoringProfile` exposes static memory behavior; `monitor.stats()` exposes
  retained logical entries at runtime.
- The optional `fast-check` adapter shrinks both generated input and emitted trace.
- 44 tests pass across 8 files, including 1,250 generated differential traces;
  typecheck, ESM/CJS build, formatting, and audit pass.
- A runnable webhook example demonstrates bounded delivery deduplication.
- Package dry-run: 19 files, 47.3 kB compressed, 260.1 kB unpacked. Package
  remains private.

## Validation gates

- [ ] Three real `lull` laws are implemented; readability still needs external review.
- [x] A planted bug reduces to a timeline of at most five events.
- [x] The same law AST runs offline and over an async event stream.
- [ ] Two developers can explain the API after reading one example.
- [x] The main core imports no agent, store, telemetry, or property-testing library.

## Next actions

1. Benchmark the progress operator's full pending-obligation scan, then replace
   it with a deadline index only if the result proves it material.
2. Decide whether lifetime uniqueness needs an external state-store interface or
   belongs in an adapter package.
3. Put the README example in front of two TypeScript developers.
4. Validate the webhook example with someone who operates webhook ingestion.
5. Luan reviews the prepared working tree, creates the initial commit, and pushes
   it when ready.
6. Only after external validation, decide whether to make the repository public.

## Known limitations

- Exact `atMostOnce` monitoring retains every distinct key for the monitor lifetime.
- Window retention bounds time, not the number of keys arriving within the window;
  reset retention depends on the reset event eventually arriving.
- Progress expiration currently scans all open obligations on every clock advance
  or event; memory is window-bounded, but CPU can grow with the active window.
- `TraceMonitor.advanceTo` handles silent time, but callers must drive the clock.
- The deletion minimizer is 1-minimal, not guaranteed globally minimal.
- Matchers support field equality, array membership, captures, and references only.
- Object partition keys use JSON serialization and do not canonicalize key order.
- There is no OpenTelemetry, Kafka, JSONL, Vitest, or Jest adapter yet.

## Session log

### 2026-08-19 — bootstrap

The initial `wake` idea was rejected as too small. Research showed crowded
categories around chaos testing, replay, conversation simulation, and durable
tool calls. The new hypothesis combines temporal contracts, property-based
testing, replay, and runtime verification. Scaffolding and semantics started in
this session.

The session completed the first implementation. The most visible proof is:

```text
Minimal generated case: ["takeover","tick"]
Minimal counterexample: 2 events
Seed: 42; path: 1:1:0:0:2
```

The local repository and private GitHub remote were approved after the vertical
slice. No commit, push, npm publication, analytics, or public announcement was
created by Codex.

### 2026-08-19 — incremental monitor

The full-trace prototype was replaced by per-operator state. The public memory
profile is deliberately honest: finite deadlines bound retention time, open
scopes bound exclusion state, and exact uniqueness remains unbounded. Prefix
equivalence against the finite verifier is covered by 750 generated traces.

### 2026-08-19 — explicit uniqueness retention

`atMostOnce` now keeps lifetime semantics by default and offers two explicit
bounded alternatives: an inclusive sliding window and a per-partition reset
event. Both are serialized in the law AST and verified offline and online. A
webhook delivery example demonstrates the windowed form.

### 2026-08-19 — open-source repository bootstrap

The README was reorganized around the problem, one readable law, concrete
counterexample output, the three execution modes, honest memory classes, local
trial, boundaries, status, and contribution paths. Community health files,
issue forms, a pull request template, security policy, and changelog were added
before the authorized initial commit.
