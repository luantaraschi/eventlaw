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

## D-014 — Index progress deadlines after measuring quadratic growth

**Status:** accepted, 2026-08-19.

The first incremental monitor removed full-trace replay but still scanned every
open progress obligation on every event. A controlled benchmark measured 7.44 ms
for 1,000 opens, 18.10 ms for 2,000, and 76.27 ms for 4,000. The 4.2× increase on
the final doubling justified an index rather than speculative optimization.

Each progress law now keeps a set per partition and a deadline-ordered linked
index. Event timestamps are nondecreasing and `withinMs` is fixed per law, so new
deadlines append in order. Satisfaction removes a node in constant time;
expiration walks only the reached prefix. Events whose type cannot be the
consequent skip binding checks entirely.

The indexed benchmark processed 16,000 opens in a 4.60 ms median on the recorded
machine. Differential tests remain the semantic authority; benchmark speed never
permits changing deadline or evidence rules.

## D-015 — Support maintained Node.js LTS lines

**Status:** accepted, 2026-08-19.

[Node.js 20 reached end-of-life](https://nodejs.org/en/about/eol) on 2026-03-24.
Before publication, the minimum engine moves to Node.js 22 and CI covers Node.js
22 and 24. GitHub Actions move to the current
[`checkout@v7`](https://github.com/actions/checkout/releases/tag/v7.0.1) and
[`setup-node@v7`](https://github.com/actions/setup-node/releases/tag/v7.0.0)
releases, removing the deprecated Node 20 action-runtime warning from the initial
workflow.

## D-016 — JSON Lines is the first trace-ingestion adapter

**Status:** accepted experimentally, 2026-08-19.

The first adapter must validate a distinct execution mode without pulling a
vendor SDK into the dependency-free core. JSON Lines directly exercises recorded
trace verification, can be produced by logs and shell pipelines, and can be read
incrementally with platform APIs. It therefore precedes OpenTelemetry, Kafka,
and test-runner reporters.

The `eventlaw/jsonl` subpath accepts UTF-8 text or byte chunks and requires one
already-normalized `TraceEvent` object per line. It validates framing and event
shape with source/line diagnostics but leaves timestamp ordering to the semantic
engines. It does not guess how arbitrary log fields map to `type`, `at`, or event
attributes.

OpenTelemetry is the leading second candidate, not an assumed commitment. Its
event name, source/observed timestamps, nanosecond representation, attributes,
and resource context require validation against real telemetry before a mapping
is frozen. Kafka additionally requires explicit ordering, offset, replay, and
consumer-failure semantics. The comparison is maintained in `docs/adapters.md`.

## D-017 — Durable uniqueness stays outside the core until a real store contract

**Status:** deferred intentionally, 2026-08-19.

An external store could preserve lifetime uniqueness across restarts without
retaining all keys in one process. A generic key-value interface is insufficient:
correctness depends on atomic check-and-record, namespacing, replay idempotency,
reset/window interaction, concurrency, and store-failure behavior.

Making monitor operations asynchronous or fallible before those requirements
are observed would widen the entire core API on speculation. The synchronous
core therefore remains unchanged. After a webhook operator supplies restart and
failure requirements, the first experiment should be a store-specific adapter;
only repeated contracts justify a portable store interface or new serializable
retention node.

## D-018 — Explicit authorization for the performance milestone commit

**Status:** accepted and consumed, 2026-08-19.

After the indexed progress implementation and maintained Node/Actions update
were verified, Luan explicitly authorized Codex to commit that prepared work and
continue. Commit `a3ea299` (`perf: index progress deadlines`) was created with
`Luan Taraschi` as both author and committer. It remains local until Luan
separately authorizes or performs a push.

This authorization applied to that commit only. D-010 remains the standing rule;
the JSONL and validation work that followed is unstaged and uncommitted.

## D-019 — Explicit authorization for the JSONL milestone commit

**Status:** accepted and consumed, 2026-08-19.

Luan explicitly authorized committing the prepared JSONL/validation milestone
and starting the next step. Commit `360e851` (`feat: add jsonl trace adapter`)
was created with `Luan Taraschi` as both author and committer. No push was
requested or performed; local `main` became two commits ahead of `origin/main`.

This authorization applied to that commit only. D-010 remains the standing rule;
the OpenTelemetry work that followed is unstaged and uncommitted.

## D-020 — OTLP/JSON Events get a structural adapter, not an SDK integration

**Status:** accepted experimentally, 2026-08-19.

No external JSONL trace existed in the workspace. Testing the JSONL boundary
against OpenTelemetry's official `events.json` fixture produced a concrete
failure: OTLP/JSON is a nested request batch rather than one normalized event per
line. The record also contains an `eventName`, uint64 nanosecond timestamps,
dotted attribute keys, resource and scope metadata, and a body whose own `type`
must not overwrite the event type.

The dependency-free `eventlaw/opentelemetry` subpath therefore converts an
already-decoded OTLP/JSON `ExportLogsServiceRequest`. It processes only log
records with a non-empty `eventName` and reports how many ordinary logs it
skipped. Source time is preferred over observed time, following the
OpenTelemetry logs data model; exact nanoseconds are retained while `at` uses
truncated integer milliseconds.

Body, record attributes, resource, and instrumentation scope remain namespaced.
Dotted semantic attribute keys become nested objects for matcher readability;
namespace collisions are errors rather than silent overwrites. OTLP request
order is preserved because sorting would invent causality.

This decision does not add an SDK, protobuf decoder, HTTP receiver, Collector
connection, authentication, compression, or backpressure policy. Those require
a real operating environment and belong in a later integration package.

## D-021 — Explicit authorization for the OTLP adapter commit

**Status:** accepted and consumed, 2026-08-19.

While the next validation step was starting, Luan explicitly authorized
committing the prepared OTLP/JSON adapter. Commit `b0c225e`
(`feat: add otlp json event adapter`) was created with `Luan Taraschi` as both
author and committer. No push was requested or performed; local `main` became
three commits ahead of `origin/main`.

This authorization applied to that commit only. D-010 remains the standing rule;
the JavaScript SDK compatibility work that followed is unstaged and uncommitted.

## D-022 — Validate OTLP with an emitted request, not only a protocol fixture

**Status:** accepted, 2026-08-19.

Repository search did not find a complete second Event payload produced by an
SDK or Collector. A temporary, isolated project therefore used the official
JavaScript logging API, SDK, resources, semantic conventions, and OTLP/HTTP
exporter to send a deterministic `application/json` request to a local capture
server. No OpenTelemetry package was added to `eventlaw`.

The captured batch contains two named Events from distinct instrumentation
scopes and one ordinary log. It proved the existing mapping for nested bodies,
arrays, numeric AnyValues, dotted attributes, resource metadata, multiple
scopes, skipped logs, and correlated laws. It also exposed one incompatibility:
an Event emitted without a body is serialized as `body: {}`. The adapter now
treats that empty AnyValue object as an absent body while continuing to reject
non-empty objects without a recognized AnyValue variant.

The fixed payload is retained as a regression fixture with exact SDK versions
and capture method documented. It is evidence for structural OTLP/JSON
compatibility, not evidence for Collector networking, protobuf, backpressure, or
ordering across separate export requests.

## D-023 — Explicit authorization for the SDK-compatibility commit

**Status:** accepted and consumed, 2026-08-19.

Luan explicitly authorized committing the JavaScript SDK compatibility fix and
starting the Collector validation. Commit `3433993`
(`fix: accept empty otlp event bodies`) was created with `Luan Taraschi` as both
author and committer. No push was requested or performed; local `main` became
four commits ahead of `origin/main`.

This authorization applied to that commit only. D-010 remains the standing rule;
the Collector validation that followed is unstaged and uncommitted.

## D-024 — Collector normalization must preserve the converted trace

**Status:** accepted, 2026-08-19.

The deterministic JavaScript SDK batch was sent through the official
`otel/opentelemetry-collector:0.157.0` image, pinned by digest. The Collector used
an OTLP/HTTP receiver and the stable `otlp_http` exporter with JSON encoding,
compression disabled, and no processors.

The Collector removed protobuf default values such as zero dropped-attribute
counts and empty attribute arrays. It also canonicalized the SDK's numeric
`intValue: 0` to the OTLP/JSON decimal string `"0"`. No business data, Event
identity, timestamp, resource, or scope changed.

The adapter already accepts both allowed int64 representations and optional
default fields. The direct SDK request and Collector output therefore must
convert to deep-equal `OtlpEventConversion` results. This equivalence is now a
regression test; vendor-specific branches were rejected because no semantic
difference was observed.

## D-025 — Cross-resource correlation preserves OTLP trace flags

**Status:** accepted experimentally, 2026-08-19.

An application-shaped validation used two independent JavaScript
`LoggerProvider` resources for `checkout-api` and `fulfillment-worker`. Each
exported one named Event with explicit valid W3C trace context. Collector
0.157.0 batched both requests into one JSON export containing two
`resourceLogs`, preserving a shared trace ID, distinct span IDs, and `flags: 1`.

Resource identity must remain attached to each Event, but it must not become an
implicit partition: a business law can legitimately correlate progress across
services. The trigger therefore captures both `order.id` and `otel.traceId`, and
the consequence must match both. Changing only the consequence trace ID turns
the report from pass to fail.

The adapter already retained trace and span IDs but silently omitted OTLP
`flags`. It now preserves the field as `otel.flags` and validates it as uint32.
This keeps sampled trace context available without interpreting vendor policy or
adding telemetry dependencies. The harness is deterministic project-generated
evidence, not a substitute for an anonymized external application payload.

## D-026 — Explicit authorization for the Collector milestone commit and push

**Status:** accepted and consumed, 2026-08-19.

After reviewing the completed Collector normalization and multi-resource trace
work, Luan explicitly authorized Codex to commit the current milestone and push
all local `main` progress to GitHub. The commit must use `Luan Taraschi` as both
author and committer. Direct publication to `origin/main` is intentional; no
intermediate pull request was requested.

This exception covers exactly the reviewed working tree and its direct push,
including both previously captured Collector fixtures, trace-flag preservation,
regression tests, and documentation. D-010 resumes immediately afterward.

## D-027 — The README hero is a wordmark only

**Status:** accepted, 2026-08-19.

The first diagrammatic direction was rejected because the hero should display
the project name rather than explain the product. The revised SVG contains only
`eventlaw`, centered with generous negative space. `event` uses the theme's ink;
`law` carries a restrained violet-to-teal gradient as the sole visual gesture.

Theme-specific SVGs share transparent geometry and use no external fonts,
scripts, or bitmap text. Product explanation remains searchable README prose.
The top keeps five factual badges and avoids adoption signals that do not yet
have public evidence.

Luan approved the revised wordmark and requested transparent PNG delivery. The
README uses theme-specific PNG exports with verified alpha channels, while SVGs
remain the editable sources. Its type treatment and `law` gradient can now form
the basis for a repository avatar and social-preview image.

## D-028 — Explicit authorization for the visual identity commit and push

**Status:** accepted and consumed, 2026-08-19.

After approving the name-only wordmark and its transparent PNG exports, Luan
asked for the result to be pushed to the repository. This explicitly authorizes
one commit containing the reviewed visual-identity working tree and a direct
push to `origin/main`, using `Luan Taraschi` as both author and committer.

The scope includes the theme-aware SVG sources and PNG exports, README header,
brand guide, npm asset allowlist, and continuity documentation. No intermediate
branch or pull request was requested. D-010 resumes immediately after this
commit and push.

## D-029 — The product site is an executable temporal law laboratory

**Status:** accepted, 2026-08-19.

Lull was used as a product-communication reference, not as a visual template.
Eventlaw adopts its discipline of a concise thesis, real browser execution, and
honest limitations, while deliberately avoiding its light paper canvas, serif
prose, indigo palette, and editorial notebook composition.

Eventlaw instead uses a dark blue-green diagnostic surface with the approved
violet-to-teal `law` gradient, sans/monospace typography, line-based grouping,
and an asymmetric hero. The signature element is a Trace Lab that imports the
actual library core. It demonstrates fail, pass, and pending semantics and calls
the actual minimizer rather than reproducing expected output as static text.

The page remains framework-free and builds with the repository's existing tsup
toolchain. This keeps Pages deployment small and ensures the product proof tracks
source behavior. `design-system/eventlaw/MASTER.md` is the canonical visual and
interaction specification for later sessions.

## D-030 — Explicit authorization for the GitHub Pages publication

**Status:** accepted for the current publication, 2026-08-19.

Luan requested creation of a GitHub Pages site and linkage of its live URL from
the repository. That request authorizes the required site commit, direct push to
`origin/main`, Pages source configuration, repository homepage update, and live
deployment verification. Author and committer must both remain `Luan Taraschi`.

The authorized scope is the reviewed static site, real Trace Lab bundle entry,
design system, social assets, README/package links, Pages workflow, validation
notes, and continuity records. D-010 resumes immediately after publication.

## D-031 — The site palette is neutral graphite, violet, and blue

**Status:** accepted, 2026-08-19.

Luan found that the green cast of the original dark canvas conflicted with the
blue and violet identity. The website therefore replaces blue-green backgrounds,
surfaces, rules, and accents with neutral blue-graphite surfaces plus violet and
blue signals. Green remains only where it communicates a passing verification.

The Generated / Recorded / Live connector also moves to its own marker row on
wide layouts. Previously it shared the title baseline and visibly crossed the
three labels. Large headings use less negative tracking and a slightly more open
line height so their glyphs remain distinct at intermediate and mobile widths.

This is a website-specific evolution. The previously approved transparent README
wordmark assets remain unchanged until Luan explicitly requests a repository-wide
brand revision.

## D-032 — Explicit authorization for the palette correction commit and push

**Status:** accepted for the current publication, 2026-08-19.

After reviewing the neutral palette and text-overlap correction, Luan explicitly
authorized committing and pushing the complete revision. The commit must use
`Luan Taraschi` as both author and committer and may be published directly to
`origin/main`, matching the established repository workflow.

The authorized scope includes the site palette and layout correction, favicon,
social card, theme metadata, design system, validation record, and continuity
documentation. D-010 resumes immediately after this publication.
