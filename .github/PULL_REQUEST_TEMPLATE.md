## What this changes

<!-- Describe the production rule or problem first, then the implementation. Link the issue if one agreed the semantics. -->

## Semantics and evidence

<!-- Include the smallest passing and failing traces. If finite or online behavior changes, explain the boundary and retention rules. -->

## How it was checked

- [ ] `npm run check`
- [ ] `npm run format:check`
- [ ] `npm audit --audit-level=low`
- [ ] Differential coverage added when finite and online engines both change
- [ ] `docs/spec.md` updated for semantic changes
- [ ] `CHANGELOG.md` updated under `[Unreleased]` for user-visible changes

## Constraints

- [ ] Law ASTs remain JSON-safe data
- [ ] The semantic core does not read the wall clock or perform I/O
- [ ] The main entry has no runtime dependencies
- [ ] Memory behavior is explicit and observable
- [ ] Tests use explicit time and do not sleep
