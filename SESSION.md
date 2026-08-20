# Session handoff

Read this file first when resuming work in a new session.

## Objective

Validate `eventlaw`: one TypeScript law definition should support generated
tests, recorded-trace verification, and online monitoring while producing a
small, readable counterexample.

## Current phase

Vertical slices 1 through 4 are complete. The first public beta is live on npm;
maintainer dogfood and external API review remain open.

## Current status

- The package name is `eventlaw`; `0.1.0-beta.1` is published on npm under the
  `beta` channel and the repository no longer carries a `private` guard.
- Local Git repository initialized on `main`; public remote available at
  `https://github.com/luantaraschi/eventlaw` and linked as `origin`.
- Initial commit `0882d88` and the five later milestones through the
  multi-resource Collector validation are on `origin/main`. Luan explicitly
  authorized every commit and the direct push; author and committer are
  `Luan Taraschi`.
- Luan delegates routine commands and repository operations to Codex by default;
  requested work includes its normal staging, commits, pushes, and PR handling.
  Commits retain his configured identity and never add Codex attribution.
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
- 69 tests pass across 10 files, including 1,250 generated differential traces;
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
- The SDK batch was passed through Collector 0.157.0 and captured again. Collector
  default omission and int64 canonicalization produce the exact same conversion.
- Two independent application resources were batched by Collector into one
  request. Cross-service laws can correlate their shared trace ID while resource
  identity and distinct span IDs remain visible; OTLP trace flags are preserved.
- Durable lifetime uniqueness remains deferred to a store-specific adapter until
  atomicity, replay, restart, and failure requirements come from an operator.
- Node.js 22 is now the minimum; CI is prepared for Node 22/24 with official v7
  GitHub Actions.
- The release package contains 36 allowlisted files, 110,899 bytes compressed,
  and 407,087 bytes unpacked. Its dry-run file list contains no credentials,
  fixtures, tests, source files, or internal continuity documents.
- Registry installation passes for ESM, CommonJS, and every public subpath. The
  published integrity and SHA-1 values exactly match the reviewed tarball.
- npm trusted publishing connects `eventlaw` to `luantaraschi/eventlaw`,
  `release.yml`, and the GitHub `npm` environment with publish-only permission.
- Package publishing access requires MFA; traditional tokens cannot bypass the
  interactive policy, while the scoped OIDC trusted publisher remains allowed.
- Tag `v0.1.0-beta.1` points to release-preparation commit `c83cb75`; the release
  workflow skipped duplicate npm publication and created a GitHub pre-release.
- Release readiness is now prepared locally: clean-consumer ESM, CommonJS, type,
  and subpath smoke tests; tag-driven npm OIDC workflow; public stability and
  release policies; Dependabot; and a public-only CodeQL workflow.
- Seven seed issues exist in the public GitHub repository: three documentation
  `good first issue` tasks, two design proposals, one performance investigation,
  and one external OTLP validation task.
- GitHub dependency alerts, automated security fixes, secret scanning, push
  protection, private vulnerability reporting, and CodeQL are enabled. Ruleset
  `Protect main after public beta` protects `main` after the release handoff.
- Release verification passes: 69 tests, strict types, ESM/CJS/declarations,
  formatting, zero audit findings, actionlint 1.7.12, and clean-consumer package
  imports. The complete gate was rerun on 2026-08-20 after the dogfood plan and
  before its authorized direct publication.
- The beta-readiness and dogfood-planning milestone is committed and pushed
  directly to `main` under Luan's explicit authorization.
- A theme-aware SVG README hero and visual-identity guide are drafted after that
  push. The first diagrammatic direction was rejected; the current draft is a
  wordmark-only display approved by Luan. The README uses transparent PNG
  exports and retains SVG sources. The visual milestone is committed and pushed
  under Luan's explicit authorization.

## Validation gates

- [ ] The packed candidate works in `lull` and one other maintainer-owned project.
- [ ] Generated, recorded, and live modes are exercised across those consumers.
- [ ] Three real `lull` laws are implemented; readability still needs external review.
- [x] A planted bug reduces to a timeline of at most five events.
- [x] The same law AST runs offline and over an async event stream.
- [ ] Two developers can explain the API after reading one example.
- [x] The main core imports no agent, store, telemetry, or property-testing library.

## Next actions

1. Install the packed candidate into `lull` and one other owned event-driven
   project using `docs/dogfood.md`.
2. Record at least three real laws across generated, recorded, and live modes;
   fix or explicitly accept every blocker.
3. Put the README example in front of two TypeScript developers.
4. Validate the webhook example with someone who operates webhook ingestion.
5. Record the anonymized results using `docs/validation.md`; change the API or
   README only when a misunderstanding repeats.
6. Validate the OTLP mapping against an anonymized external application export;
   the deterministic two-service harness is complete.
7. Ask whether truncating nanoseconds, nesting semantic attribute keys, and
   matching on trace IDs fit how an operator would write laws.
8. Run future releases through the tag-driven OIDC workflow documented in
   `docs/releasing.md`; do not create long-lived npm publishing tokens.

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

### 2026-08-19 — Collector round-trip validation

Luan authorized commit `3433993` for the SDK compatibility fix; it was created
under his Git identity and not pushed. The following work remains uncommitted.

The deterministic SDK batch was sent through the official Collector 0.157.0
container using an OTLP/HTTP receiver and JSON OTLP/HTTP exporter. The Collector
removed default zeros and empty arrays and canonicalized a numeric int64 to its
decimal-string form. The adapter required no branch or fix: direct SDK and
Collector payloads produce deep-equal traces and skipped-log counts. The
container was stopped and removed after capture.

### 2026-08-19 — Multi-resource trace correlation

Two independent SDK logger providers represented a checkout API and fulfillment
worker. They exported deterministic Events with one shared trace ID and distinct
span IDs through Collector 0.157.0. Its batch processor emitted a single request
with two resource groups. A law matching both order ID and trace ID passes on the
capture and fails when only the consequence trace ID changes.

The payload exposed OTLP `flags: 1`, which the adapter previously omitted. Trace
flags now remain at `otel.flags` after uint32 validation. The fixture, source
change, tests, and documentation form the authorized Collector milestone.

### 2026-08-19 — Collector milestone publication

Luan explicitly authorized committing the complete reviewed working tree and
pushing all local `main` progress to GitHub. The snapshot includes Collector
normalization equivalence, cross-resource trace correlation, trace-flag
preservation, fixtures, tests, and documentation. The direct push intentionally
publishes the five post-bootstrap milestones without an intermediate PR. D-010
resumes after this one-time exception.

### 2026-08-19 — README visual direction

The user references ranged from a large expressive wordmark to restrained marks
and a product logo with a single promise. The first `eventlaw` direction used a
law executing on a trace, but Luan clarified that the hero should only display
the project name. It was replaced by a centered lowercase wordmark with `law` as
the single color gesture. Light and dark SVG variants, factual badges, concise
navigation, and a brand guide form the revised draft.

The image-generation workflow was evaluated, but deterministic repository-native
SVG was selected because the asset is a logo-like interface graphic with exact
text. The result has no remote font, script, animation, or raster dependency.
All visual work remains unstaged and uncommitted for Luan's review.

Luan then approved the wordmark and requested PNG-like transparency. Exact PNG
exports were rendered from both SVG sources at 1280 × 280 with four channels and
verified alpha. The README now selects them by theme, and `assets` is included in
the future npm package so relative images remain available.

### 2026-08-19 — Visual identity publication

Luan authorized committing and pushing the approved wordmark milestone directly
to `origin/main`. The snapshot includes SVG sources, transparent theme-specific
PNGs, README integration, brand documentation, and package inclusion. Author and
committer remain Luan; the standing no-commit rule resumes after publication.

### 2026-08-19 — GitHub Pages product site

The Eventlaw site uses a distinct “temporal law laboratory” identity rather than
Lull's light editorial treatment. Its dark blue-green base, violet-to-teal brand
signal, diagnostic typography, line-based structure, and asymmetric hero are
specified in `design-system/eventlaw/MASTER.md`.

The static page lives under `site/`. Its Trace Lab bundles the repository's real
verifier and minimizer, with failing, passing, and pending scenarios. The failing
trace is reduced from five events to the two that explain the violation. Theme
preference, keyboard tabs, visible focus, responsive behavior, reduced motion,
social metadata, and a 1200 × 630 social card are included.

Local validation covers 69 tests, strict TypeScript, the production site bundle,
Prettier, all three interactive states, both visual themes, 320/375/768/1440 px
layouts, zero horizontal page overflow, zero browser-console errors, and zero
axe-core 4.13 violations. The Pages workflow, README link, and package homepage
are ready for the authorized commit, push, GitHub Pages enablement, and live URL
verification.

### 2026-08-19 — Neutral palette and typography correction

Luan's live-site captures exposed two design defects: the dark theme carried a
green cast that fought the violet/blue wordmark, and the three-mode connector ran
through its titles. The local revision moves the connector to a marker-only row,
opens large-heading tracking and line height, and replaces the site palette with
neutral blue-graphite surfaces plus violet and blue accents. Green is now reserved
for the pass status.

The site-specific design system, favicon, browser theme colors, and social-card
source were updated together. README wordmark assets were intentionally preserved.
Browser QA covers 320/598/768/1024/1253/1440 px with no horizontal overflow,
zero console errors, and zero axe-core violations in light and dark modes. Luan
then authorized committing the complete correction and pushing it directly to
`origin/main`, with his Git identity retained as author and committer.
