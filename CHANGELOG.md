# Changelog

All notable changes to this project will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project intends to follow [Semantic Versioning](https://semver.org/) once
the package leaves research preview.

## [Unreleased]

### Added

- Release-candidate metadata for `0.1.0-beta.1`, an installed-package smoke test,
  npm trusted-publishing workflow, CodeQL workflow, and Dependabot configuration.
- Public stability, release, maintainer-dogfood, and contribution-roadmap
  documents.
- Theme-aware README wordmark and documented visual identity.
- Serializable event matchers with constraints, captures, and references.
- Progress, exclusion, and uniqueness laws with partitioned verification.
- Three-valued reports, vacuity warnings, and deterministic time semantics.
- Deletion-minimal counterexamples and readable timelines.
- Incremental monitoring with explicit memory profiles and retained-state stats.
- Lifetime, sliding-window, and reset-scoped uniqueness retention.
- Optional `fast-check` generation and two-stage shrinking.
- Real `lull` integration plus generated-failure and webhook examples.
- Reproducible progress-monitor benchmark with recorded baseline.
- Experimental `eventlaw/jsonl` adapter for in-memory and streaming JSON Lines
  traces with source/line diagnostics.
- External API and webhook validation protocol plus an evidence-based adapter
  comparison.
- Experimental dependency-free `eventlaw/opentelemetry` conversion for OTLP/JSON
  Events, verified against the official protocol fixture, JavaScript SDK, and
  Collector batches with multiple resources and trace context.

### Changed

- Replaced repeated progress-obligation scans with a deadline-ordered index.
- Treat empty OTLP AnyValue bodies emitted by the JavaScript SDK as absent.
- Preserve validated OTLP trace flags alongside trace and span identifiers.
- Raised the minimum Node.js version from 20 to 22 after Node 20 reached EOL.
- Updated GitHub Actions to `checkout@v7` and `setup-node@v7` and CI coverage to
  Node.js 22 and 24.

### Known limitations

- The package is private and unpublished while the API is validated externally.
- Lifetime uniqueness is intentionally unbounded without an explicit retention law.
- Consequence matching still examines pending obligations in the event's
  partition when captures differ.
