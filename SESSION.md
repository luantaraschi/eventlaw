# Session handoff

Read this file first when resuming work in a new session.

## Objective

Validate `eventlaw`: one TypeScript law definition should support generated
tests, recorded-trace verification, and online monitoring while producing a
small, readable counterexample.

## Current phase

Vertical slices 1 through 4 are complete. The project is now validating API
readability with external users and deciding the first integration adapters.

## Current status

- Name checked and provisionally changed from `tracecheck` to `eventlaw`.
- Package is intentionally private and unpublished.
- Local Git repository initialized on `main`; private remote created at
  `https://github.com/luantaraschi/eventlaw` and linked as `origin`.
- Initial commit `0882d88` is on `origin/main`; its Node 20/22 CI passed.
- Luan explicitly authorized local commits `a3ea299` (performance), `360e851`
  (JSONL), and `b0c225e` (OTLP/JSON). Author and committer are `Luan Taraschi`;
  local `main` is three commits ahead of the remote. All exceptions are consumed
  and no push was performed.
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
- Progress uses per-partition sets plus a deadline-ordered linked index. The
  benchmark changed from quadratic growth to an approximately linear curve.
- The optional `fast-check` adapter shrinks both generated input and emitted trace.
- 66 tests pass across 10 files, including 1,250 generated differential traces;
  typecheck, ESM/CJS build, formatting, and audit pass.
- A runnable webhook example demonstrates bounded delivery deduplication.
- An experimental dependency-free `eventlaw/jsonl` subpath parses text or byte
  streams with UTF-8, event-shape, source, and line diagnostics.
- `docs/validation.md` defines two API-comprehension sessions and one webhook
  operator session with observable pass criteria.
- JSONL was selected as the first trace adapter.
- A dependency-free `eventlaw/opentelemetry` subpath converts OTLP/JSON Events.
  It is tested against the official protocol fixture pinned at commit `b594790`.
- The OTLP adapter preserves body/metadata namespaces, exact nanoseconds, input
  order, visible skipped logs, and readable nested semantic attributes.
- A second OTLP fixture was emitted by the official JavaScript SDK and HTTP
  exporter. It covers multiple scopes, structured bodies, arrays, numeric
  AnyValues, an ordinary log, and an Event without a body.
- Empty AnyValue bodies serialized by the JavaScript SDK are treated as absent;
  non-empty invalid AnyValue objects still fail.
- Durable lifetime uniqueness remains deferred to a store-specific adapter until
  atomicity, replay, restart, and failure requirements come from an operator.
- Node.js 22 is now the minimum; CI is prepared for Node 22/24 with official v7
  GitHub Actions.
- Package dry-run: 32 files, 66.7 kB compressed, 357.1 kB unpacked. Package
  remains private.
- All work after `b0c225e` is unstaged and uncommitted for Luan.

## Validation gates

- [ ] Three real `lull` laws are implemented; readability still needs external review.
- [x] A planted bug reduces to a timeline of at most five events.
- [x] The same law AST runs offline and over an async event stream.
- [ ] Two developers can explain the API after reading one example.
- [x] The main core imports no agent, store, telemetry, or property-testing library.

## Next actions

1. Put the README example in front of two TypeScript developers.
2. Validate the webhook example with someone who operates webhook ingestion.
3. Record the anonymized results using `docs/validation.md`; change the API or
   README only when a misunderstanding repeats.
4. Validate the OTLP mapping against a Collector-produced payload or a real
   application export, especially multiple resource batches and trace context.
5. Ask whether truncating nanoseconds and nesting semantic attribute keys match
   how an operator would write laws.
6. Luan reviews the SDK-compatibility working tree and decides when to push the
   three local commits.
7. Only after external validation, decide whether to make the repository public.

## Known limitations

- Exact `atMostOnce` monitoring retains every distinct key for the monitor lifetime.
- Window retention bounds time, not the number of keys arriving within the window;
  reset retention depends on the reset event eventually arriving.
- A matching consequence still scans pending obligations in its partition when
  capture bindings differ; benchmark a real schema before indexing captures.
- `TraceMonitor.advanceTo` handles silent time, but callers must drive the clock.
- The deletion minimizer is 1-minimal, not guaranteed globally minimal.
- Matchers support field equality, array membership, captures, and references only.
- Object partition keys use JSON serialization and do not canonicalize key order.
- JSONL input must already be normalized to `TraceEvent`; there is no mapping DSL
  for arbitrary source fields.
- OTLP support accepts decoded JSON Events only. It does not decode protobuf,
  connect to a Collector, or define ordering across separate requests.
- OTLP nanoseconds are truncated to milliseconds for `TraceEvent.at`; exact
  decimal strings remain under `otel`.
- Dotted OTLP attributes become nested paths and ambiguous prefix collisions are
  rejected rather than renamed.
- There is no Kafka, Vitest, or Jest adapter yet.

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

### 2026-08-19 — indexed progress monitoring

A benchmark proved the pending-obligation scan quadratic: 4,000 opens took a
76.27 ms median. Per-partition sets plus a deadline-ordered linked index reduced
the reproducible 4,000-open median to about 1 ms and handled 16,000 in under 5 ms
without changing differential semantics. Node 20 support was also removed after
EOL; the prepared CI targets maintained Node 22 and 24 lines.

### 2026-08-19 — external validation and first trace adapter

Luan authorized commit `a3ea299` for the performance/CI milestone; it was created
under his Git identity and not pushed. The following work remains uncommitted.

A repeatable validation protocol now measures API comprehension and webhook
operational fit instead of collecting preference-based feedback. JSON Lines was
selected over OpenTelemetry, Kafka, and test-runner reporters as the first thin
adapter because it exercises recorded traces with no vendor dependency. The new
`eventlaw/jsonl` subpath parses in-memory or streaming UTF-8 input and emits
source/line diagnostics. A runnable webhook JSONL trace proves the package path.

OpenTelemetry remains the next candidate after a real record resolves timestamp,
attribute, and resource mapping. Durable uniqueness stays outside the core until
an operator supplies atomicity, restart, replay, and failure requirements.

### 2026-08-19 — official OTLP/JSON event boundary

Luan authorized commit `360e851` for the JSONL/validation milestone; it was
created under his Git identity and not pushed. The following work remains
uncommitted.

No external trace was present in the workspace. The official OpenTelemetry
protocol `events.json` fixture was pinned and tested unchanged. Generic JSONL
correctly rejected it because OTLP is a nested request batch rather than a
normalized event per line.

That evidence produced a separate dependency-free `eventlaw/opentelemetry`
subpath. It converts only named LogRecord Events, counts ordinary skipped logs,
prefers source time with observed-time fallback, retains exact nanoseconds,
decodes AnyValue, namespaces body/resource/scope data, nests dotted semantic
attributes, rejects collisions, and preserves request order. It does not add an
SDK, network receiver, protobuf, or cross-request ordering policy.

### 2026-08-19 — JavaScript SDK export validation

Luan authorized commit `b0c225e` for the structural OTLP adapter; it was created
under his Git identity and not pushed. The following work remains uncommitted.

A temporary isolated project used the official JavaScript logs API/SDK and
OTLP/HTTP exporter to send two deterministic Events from different
instrumentation scopes plus one ordinary log to a local capture server. The
captured request is retained as a versioned regression fixture; none of those
packages became an `eventlaw` dependency.

The adapter passed the batch except for a real exporter behavior: an Event with
no body arrived as `body: {}`. Empty AnyValue objects are now omitted as absent
bodies, while malformed non-empty variants still fail. A correlated progress law
runs directly over the two converted SDK Events.
