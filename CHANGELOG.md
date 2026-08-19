# Changelog

All notable changes to this project will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project intends to follow [Semantic Versioning](https://semver.org/) once
the package leaves research preview.

## [Unreleased]

### Added

- Serializable event matchers with constraints, captures, and references.
- Progress, exclusion, and uniqueness laws with partitioned verification.
- Three-valued reports, vacuity warnings, and deterministic time semantics.
- Deletion-minimal counterexamples and readable timelines.
- Incremental monitoring with explicit memory profiles and retained-state stats.
- Lifetime, sliding-window, and reset-scoped uniqueness retention.
- Optional `fast-check` generation and two-stage shrinking.
- Real `lull` integration plus generated-failure and webhook examples.

### Known limitations

- The package is private and unpublished while the API is validated externally.
- Lifetime uniqueness is intentionally unbounded without an explicit retention law.
- Progress expiration still scans open obligations and needs benchmark evidence
  before an index is introduced.
