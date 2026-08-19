# Decisions

This file records decisions that should survive individual work sessions.

## D-001 — Project instead of a `lull` feature

**Status:** accepted, 2026-08-19.

The project targets event-driven systems generally. `lull` is the first dogfood
case, not a runtime dependency of the core.

## D-002 — Working name `eventlaw`

**Status:** accepted provisionally, 2026-08-19.

`tracecheck` collides with an active GitHub project that evaluates agent traces.
`eventlaw` was absent from npm and had no meaningful exact GitHub collision when
checked. The package remains `private: true`; availability is not a reason to
publish before validation.

## D-003 — Start with a serializable AST

**Status:** accepted, 2026-08-19.

Matchers use field paths, literal constraints, captures, and capture references.
They do not embed predicate functions. This keeps laws portable across a test
runner, JSON trace verifier, worker, and future non-JavaScript monitor.

Trade-off: arbitrary predicates are more expressive. We prefer a smaller
portable language first and will add escape hatches only after real examples
prove they are necessary.

## D-004 — Three-valued semantics

**Status:** accepted, 2026-08-19.

A progress obligation can be neither satisfied nor late yet. Reports therefore
use `pass`, `fail`, or `pending`. A boolean result would incorrectly turn an open
stream into either success or failure.

## D-005 — Vacuity is visible

**Status:** accepted, 2026-08-19.

If a law says “after payment requested, eventually payment captured” but the
trace contains no request, it passes vacuously and emits a warning. Silent green
results caused by a misspelled trigger are too dangerous.

## D-006 — Offline verifier before generator or production monitor

**Status:** accepted, 2026-08-19.

All later engines need the same semantics. We will make finite-trace behavior
precise first, prove it with `lull`, and only then add streaming memory management
and `fast-check` integration.

## D-007 — `fast-check` is an optional subpath

**Status:** accepted, 2026-08-19.

The main `eventlaw` entry stays dependency-free. Generative testing lives at
`eventlaw/fast-check`, with `fast-check` declared as an optional peer. This keeps
trace verification and future production monitoring from pulling a test library
into runtime deployments.

## D-008 — Normalize lifecycle end, including TTL expiry

**Status:** accepted, 2026-08-19.

The `lull` adapter emits `takeover.ended` for both explicit release and lazy TTL
expiry. A law based only on `takeover.released` would leave an interval open and
falsely flag legitimate turns after expiry. Adapters must expose semantic events,
not merely rename input calls.

## D-009 — Session continuity is a repository artifact

**Status:** accepted, 2026-08-19.

`AGENTS.md`, `SESSION.md`, `DECISIONS.md`, the semantic spec, and dated work logs
form the handoff contract. Material work is incomplete until the handoff states
what changed, what passed, what remains risky, and what should happen next.

## D-010 — Commits belong exclusively to Luan

**Status:** accepted, 2026-08-19.

Codex may inspect and edit the working tree, run verification, document changes,
and suggest a commit message. It must never execute `git commit`, amend a commit,
or invoke a tool or API that creates a commit. Staging and committing remain with
Luan so repository history always represents his deliberate authorship.

Repository creation must not use generated README, license, `.gitignore`, or any
other option that creates an initial commit on GitHub.

## D-011 — Online memory guarantees are per operator

**Status:** accepted, 2026-08-19.

The monitor is incremental and does not retain the full trace. Progress laws are
`window-bounded`, exclusion laws are `scope-bounded`, and exact uniqueness laws
are `unbounded`. These labels describe retention semantics, not a vague global
claim that monitoring is bounded.

The classifications are public through `monitoringProfile`, and live retained
entry counts are observable through `TraceMonitor.stats`. A terminally failed law
releases its mutable state because later events cannot change its frozen result.

We will not silently expire uniqueness keys. A future time window, scope end, or
external state store must be explicit because each changes operational meaning.

## D-012 — Uniqueness retention is an explicit part of the law

**Status:** accepted, 2026-08-19.

`atMostOnce(...).per(...)` keeps lifetime semantics by default. Callers may opt
into an inclusive sliding window with `.within(d)` or reset keys per partition
with `.resetOn(event)`. Both choices are encoded in the serializable AST and run
identically in finite and online verification.

Windowed uniqueness compares adjacent occurrences and advances the reference on
every occurrence. Reset events clear their own partition before target matching,
which gives deterministic semantics when one event matches both reset and target.

These are not implementation cache controls: they change the business law and
therefore belong in the DSL, reports, memory profile, tests, and spec.

## D-013 — One-time authorization for the initial commit

**Status:** accepted, 2026-08-19.

Luan explicitly authorized Codex to create the repository's initial commit and
push `main` to GitHub after preparing the public README and community files. Git
author and committer identity must remain `Luan Taraschi`.

This is a one-time exception to D-010. Immediately after the first push, the
standing rule resumes: Codex may prepare and verify changes but only Luan creates
later commits unless he grants another explicit exception.
