# Contributing to eventlaw

`eventlaw` is still validating its semantics and public API. The most useful
early contributions bring a real event-driven rule, the smallest trace that
should pass or fail, or evidence that the current DSL is hard to explain.

Bug reports, law proposals, failing examples, differential tests, documentation
fixes, and benchmark results are all welcome.

## Getting set up

Node.js 22 or newer is the only runtime requirement.

```bash
git clone https://github.com/luantaraschi/eventlaw.git
cd eventlaw
npm ci
npm run check
```

| Command                    | What it does                                    |
| -------------------------- | ----------------------------------------------- |
| `npm test`                 | Runs the complete test suite once               |
| `npm run test:watch`       | Runs affected tests while editing               |
| `npm run typecheck`        | Checks the public and internal TypeScript types |
| `npm run build`            | Builds ESM, CommonJS, and declarations          |
| `npm run check`            | Runs types, tests, and build                    |
| `npm run package:smoke`    | Installs and imports the packed public package  |
| `npm run release:check`    | Runs every local release gate                   |
| `npm run format`           | Formats the repository with Prettier            |
| `npm run format:check`     | Runs the same formatting check as CI            |
| `npm run bench:progress`   | Measures insertion with open obligations        |
| `npm run example:lull`     | Runs the real reducer integration               |
| `npm run example:falsify`  | Generates and shrinks a failing input           |
| `npm run example:webhooks` | Demonstrates windowed webhook deduplication     |
| `npm run example:jsonl`    | Verifies a recorded JSONL trace                 |

## Reporting a bug

Most bugs can be written as four pieces:

1. the law definition;
2. the trace, including every `at` timestamp;
3. the report you received;
4. the report or counterexample you expected.

If online and finite verification disagree, include the prefix where they first
diverge and whether time advanced through an event or `advanceTo`.

## Proposing a law or operator

Open an issue before implementing a new operator or changing semantics. Describe:

- the production rule once in plain language;
- the smallest trace that should pass;
- the smallest trace that should fail;
- why existing operators cannot express it clearly;
- what an online monitor must retain to evaluate it exactly.

That last point matters. A concise DSL is not enough if its production memory
behavior is surprising or impossible to explain.

## What a pull request needs

- A focused description of the problem and the chosen semantics.
- A deterministic test that fails before the change.
- Differential coverage when both finite and online engines are affected.
- `docs/spec.md` updated for semantic changes.
- `DECISIONS.md` updated when a durable trade-off changes.
- `CHANGELOG.md` updated under `[Unreleased]` for user-visible changes.
- `npm run check`, `npm run format:check`, and `npm audit --audit-level=low` green.

Use conventional commit prefixes such as `feat:`, `fix:`, `docs:`, `test:`,
`refactor:`, `ci:`, or `chore:`. Small pull requests are easier to reason about,
especially when time and boundary conditions are involved.

## Project constraints

These constraints define the project. A proposal may challenge one, but it must
do so explicitly.

**Laws are portable data.** The AST cannot contain predicate functions, class
instances, open handles, or framework objects. It must survive a JSON round trip.

**Time is explicit.** The semantic core never reads the wall clock. Events carry
`at`; silence is represented by `advanceTo`.

**Finite and online semantics agree.** Every prefix must produce the same result
until an online failure becomes terminal.

**Memory claims are operator-specific.** A law is `window-bounded`,
`scope-bounded`, or `unbounded`. Retention is observable and eviction never
changes a business rule silently.

**The main entry has no runtime dependencies.** Framework integrations belong in
optional subpaths or adapters. `fast-check` is the current example.

**Adapters preserve the boundary.** They keep event time explicit, report
malformed input at its source, and do not leak vendor dependencies into the
semantic core.

**Tests do not sleep.** Temporal behavior is arithmetic over explicit numbers,
not real timers.

## Releasing

Maintainer only. The automated workflow, trusted-publishing contract, tag
convention, and rollback guidance live in
[docs/releasing.md](docs/releasing.md).

Contributors should not change package versions or create release tags in pull
requests unless a maintainer explicitly asks for a release preparation change.

## Code of conduct

By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
