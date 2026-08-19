# Finite-trace semantics

Status: draft 0, 2026-08-19.

This document defines behavior independently of the implementation. Examples use
epoch-like integer milliseconds, but only ordering and subtraction matter.

## Event

An event is a JSON object with two required fields:

```ts
type TraceEvent = {
  type: string
  at: number
  [field: string]: unknown
}
```

Input order breaks ties between events with the same `at`. A verifier rejects a
trace whose timestamps decrease because silently sorting would change causality.

## Matchers

A matcher selects one event type and may:

- compare a field with a literal;
- capture a field value under a name;
- compare or test array membership against a previously captured value.

Field paths use dot notation. Missing paths do not match. Matchers are plain
data, contain no JavaScript functions, and survive a JSON round trip.

## Partitions

A law may be partitioned by an event field such as `conversationId`. Each value
is verified as an independent trace. Events missing the partition field are
placed in a distinct `undefined` partition rather than discarded silently.

## Progress law

`after(A).eventually(B).within(d)` opens one obligation for every match of `A`.
Captures made by `A` are available to `B`.

- `pass`: every obligation has a matching `B` at or before `A.at + d`;
- `fail`: a matching `B` is late, or the deadline is reached without one;
- `pending`: at least one deadline remains in the future on an incomplete trace;
- vacuous `pass`: `A` never matched; the result carries a warning.

A response at exactly the deadline is on time.

## Exclusion law

`never(X).between(A, B)` opens a forbidden interval at `A` and closes it at `B`,
within each partition. `X` while the interval is open fails immediately. The
boundary events themselves are processed before the next event in input order.
An interval left open does not fail by itself.

## Uniqueness law

`atMostOnce(X).per(path)` fails when two matching `X` events yield the same value
at `path`. `perEach(path)` treats every array element as an independent key.

Uniqueness has three explicit retention modes:

- `per(path)` and `perEach(path)` default to `forever`. The first event index for
  every key is retained for the complete trace or monitor lifetime.
- `.within(d)` uses an inclusive sliding window. Two adjacent occurrences of the
  same key fail when their timestamp difference is at most `d`. An occurrence
  outside the previous window becomes the new reference. A failing occurrence
  also becomes the latest reference for any later offline violations.
- `.resetOn(R)` clears all remembered keys for the reset event's partition. Reset
  is processed before target matching, so an event matching both `R` and `X` is
  the first occurrence in the new scope.

Retention is local to each `partitionBy` value. A reset in one partition never
clears another. Window duration must be finite and non-negative.

## Verification boundary

`complete: false` means more events may arrive. `complete: true` closes all
outstanding progress obligations, even if `now` is earlier than their deadline;
this represents a source that has ended and cannot satisfy them.

`now` defaults to the last event timestamp, or zero for an empty trace. It may be
greater than the last event to represent time advancing without a new event.

## Incremental monitoring

`TraceMonitor.advanceTo(at)` advances time without inventing a domain event. A
progress failure observed at a deadline is terminal: a later event cannot rewrite
the fact that the deadline elapsed. Events older than the monitor clock are
rejected. Events at the exact clock are accepted, but cannot undo an already
observed violation.

The incremental monitor stores event indexes for evidence but not the events
themselves. `traceLength` is the number of processed events, not retained trace
storage. A live report must match finite verification for every prefix until a
failure is first observed; after that, the failing law result is frozen.

Progress obligations are indexed in nondecreasing deadline order and grouped by
partition for consequence matching. This changes lookup cost, not semantics:
exact-deadline events are still evaluated before expiration, and completion still
closes every remaining obligation.

For a pushed event, existing progress obligations see the event before deadlines
at that timestamp are closed. Therefore, a consequent exactly at its deadline is
valid. The event then opens any new obligations, and deadlines reached at that
same timestamp are closed. This preserves the finite rule that an event cannot
satisfy an obligation it creates itself.

On completion, every open progress obligation fails even when its deadline is in
the future, because the source can no longer produce its consequent.

## Online memory classes

Memory guarantees are operator-specific:

| Operator                              | Class            | Retained state                                                |
| ------------------------------------- | ---------------- | ------------------------------------------------------------- |
| `eventually(...).within(d)`           | `window-bounded` | unmatched triggers and captures until consequence or deadline |
| `never(...).between(A, B)`            | `scope-bounded`  | one start index for each currently open partition             |
| `atMostOnce(...).per(...)`            | `unbounded`      | every distinct key for the monitor lifetime                   |
| `atMostOnce(...).per(...).within(d)`  | `window-bounded` | latest occurrence of keys whose window has not elapsed        |
| `atMostOnce(...).per(...).resetOn(R)` | `scope-bounded`  | distinct keys since the last reset in each partition          |

“Window-bounded” limits retention time, not the number of events that can arrive
inside the window. “Scope-bounded” depends on users eventually closing scopes and
on the number of simultaneously open partitions.

`monitoringProfile(laws)` exposes the static class and rationale.
`monitor.stats()` exposes current retained-entry counts per law. Once a law fails,
its report is terminal and its mutable operator state is released.

Exact lifetime `atMostOnce` cannot become bounded without changing its meaning.
The `within` and `resetOn` APIs make two such trade-offs explicit. An externally
managed key store remains a possible future option for lifetime uniqueness that
must survive process restarts.

## Minimization

The first minimizer uses deletion only: repeatedly remove events while the same
named law still fails. It guarantees a 1-minimal trace with respect to single
event deletion, not a globally smallest trace. Later generator-aware shrinking
may also simplify field values and time gaps.

The `fast-check` adapter adds an outer shrinking layer. `fast-check` first
reduces the generated test case; `eventlaw` then deletion-minimizes the trace
emitted by that case. The two artifacts are retained because a small command
sequence and a small behavioral counterexample answer different debugging
questions.
