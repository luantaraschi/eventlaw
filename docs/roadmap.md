# Roadmap to the public beta

The core feature set is intentionally narrow enough to validate. Kafka,
persistent stores, extra temporal operators, and framework adapters are not
release blockers.

`0.1.0-beta.1` opens the package for public experimentation before the dogfood
and human-validation items below are complete. Unchecked items remain evidence
gaps, not implied successes.

## Maintainer dogfood

- [ ] Install the packed candidate into `lull` as a normal consumer dependency.
- [ ] Exercise it in one other maintainer-owned event-driven project.
- [ ] Cover generated, recorded, and live execution across the two projects.
- [ ] Record integration friction, useful counterexamples, and operational
      assumptions using [dogfood.md](dogfood.md).

This phase runs before external sessions. It may expose packaging and domain
modeling problems, but it cannot prove that an unfamiliar developer understands
the API.

## Human release gate

- [ ] Two uncoached TypeScript developers can explain and extend one law.
- [ ] One webhook operator validates clock, partition, retry, retention, and
      restart assumptions.
- [ ] Repeated misunderstandings are resolved in the API or README.

Session instructions and anonymized recording fields live in
[validation.md](validation.md).

## Prepared in the repository

- [x] Node.js 22 and 24 CI.
- [x] ESM, CommonJS, declaration, and tarball builds.
- [x] Clean-consumer package smoke test for every entry point.
- [x] Tag-driven npm trusted-publishing workflow.
- [x] Dependabot and public-repository CodeQL automation.
- [x] Public compatibility and stability policy.
- [x] Community health files and focused issue forms.

## First community milestones

- [Improve operator examples](https://github.com/luantaraschi/eventlaw/issues/1)
  and [JSONL diagnostics](https://github.com/luantaraschi/eventlaw/issues/2).
- [Document reusable typed law collections](https://github.com/luantaraschi/eventlaw/issues/3).
- [Benchmark capture-heavy consequence matching](https://github.com/luantaraschi/eventlaw/issues/4)
  with an application-shaped trace.
- [Decide whether object partition keys need canonical serialization](https://github.com/luantaraschi/eventlaw/issues/5).
- [Explore test-runner reporting](https://github.com/luantaraschi/eventlaw/issues/6)
  without coupling the semantic core to a runner.
- [Validate OTLP mapping and cross-request ordering](https://github.com/luantaraschi/eventlaw/issues/7)
  against an anonymized external application export.

The public issue tracker is the source of truth after the repository opens. New
operators require a real rule, passing and failing traces, explicit finite
semantics, and an honest online-memory description.
