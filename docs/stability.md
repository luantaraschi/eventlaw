# Public contract and stability

This document defines what the public beta supports and which entry points remain
experimental while real-world validation continues.

## Compatibility

| Surface    | Supported baseline | Verification                                      |
| ---------- | ------------------ | ------------------------------------------------- |
| Node.js    | 22 and 24          | CI runs the complete suite on both maintained LTS |
| Modules    | ESM and CommonJS   | Clean-consumer imports from the npm tarball       |
| TypeScript | 5.6 or newer       | Declarations compile in a clean strict project    |

The core targets Node.js 22 and has no required runtime dependencies.
`fast-check` is an optional peer accepted from major versions 3 and 4.

## Entry-point stability

| Entry point              | Beta status  | Compatibility intent                                  |
| ------------------------ | ------------ | ----------------------------------------------------- |
| `eventlaw`               | Beta         | Changes follow SemVer; breakage requires a minor beta |
| `eventlaw/fast-check`    | Beta         | Same policy, with an optional peer dependency         |
| `eventlaw/jsonl`         | Experimental | Mapping may change after external trace feedback      |
| `eventlaw/opentelemetry` | Experimental | Mapping may change after external operator feedback   |

During `0.x`, a minor version may contain a breaking API change. Patch releases
must remain compatible and are reserved for fixes, documentation, and internal
changes. Every breaking change must be called out in `CHANGELOG.md` with a
migration note.

Experimental entry points still receive correctness and security fixes, but
their mapping contracts may change when real input exposes a better boundary.
They must not silently reinterpret time, ordering, partitions, or retention.

## Stable semantic commitments

The beta keeps these constraints even when the API shape evolves:

- law ASTs are JSON-safe data, not executable predicates;
- time is explicit and never read from the wall clock by the core;
- finite and online verification agree until a live failure becomes terminal;
- vacuous passes remain visible;
- memory classes are described per operator;
- uniqueness eviction is never implicit;
- the main entry remains free of runtime dependencies.

The exact behavior is normative in [spec.md](spec.md). Known limitations remain
part of the release notes rather than being hidden behind a stable label.
