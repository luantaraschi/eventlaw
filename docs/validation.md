# External validation protocol

Maintainer dogfood now runs first using [dogfood.md](dogfood.md). It is useful
integration evidence, but it does not satisfy any external comprehension or
operator gate below.

Status: ready to run. No sessions have been completed yet.

The goal is not to ask whether people like `eventlaw`. The goal is to observe
whether they can understand a law, predict its behavior, and connect it to a
production rule without coaching.

Do not explain the API before a participant answers. Record confusion before
clarifying it. Do not record names, company names, customer data, or private
production traces in this repository.

## Session A — TypeScript API comprehension

Recruit two TypeScript developers who did not work on this project. Familiarity
with event-driven systems is useful but not required. Budget 20 minutes each.

Give the participant only the README through the end of “A law you can read”.
Then ask them to:

1. Explain each of the three laws in their own words.
2. Say what `capture`, `ref`, `within`, and `partitionBy` do.
3. Predict whether a consequence exactly at its deadline passes.
4. Predict what happens when the trigger never occurs.
5. Write a law for: “after an order is accepted, the same order must be shipped
   within one hour”.

Do not correct an answer until its elapsed time and uncertainty are recorded.

The gate passes when both developers can accurately explain all three laws in
five minutes, and each can write the order law with at most one API lookup. A
wrong answer shared by both participants is an API or documentation defect, not
a training problem.

## Session B — webhook operational fit

Recruit someone who has operated webhook ingestion. Show
`examples/webhooks.ts`, then run `npm run example:webhooks` and
`npm run example:jsonl`.

Ask:

1. Is `deliveryId` unique globally, per provider, endpoint, or tenant?
2. Is the retry horizon a business guarantee or only a provider guideline?
3. Which timestamp is authoritative: provider creation, receipt, or processing?
4. Can an identifier be legitimately reused after the horizon?
5. Must duplicate knowledge survive restarts and deployments?
6. What should happen when the persistent store is unavailable?
7. Would the smallest useful input be JSONL, OpenTelemetry logs, Kafka records,
   or test-runner output?

The session succeeds if the operator can identify the law's partition, key,
clock, retention horizon, and restart requirement. A requirement for durable
lifetime uniqueness is evidence for a store adapter; it is not permission to add
implicit eviction or asynchronous storage to the core.

## Recording template

Copy this block below the dated work log for each anonymized session:

```md
### Validation session <number>

- Profile: <TypeScript experience and relevant operating experience>
- Material shown: <README/webhook/JSONL>
- Time to first correct explanation: <duration>
- Correct without coaching: <items>
- Incorrect or uncertain: <items>
- Language they expected: <exact short phrases, no identifying information>
- Production constraint discovered: <partition/key/clock/retention/restart>
- Decision: <keep/change/investigate>
```

## Decision rules

- Change names or documentation after the same misunderstanding appears twice.
- Do not add an operator without one smallest passing trace, one smallest failing
  trace, and an explainable online retention policy.
- Do not choose a vendor SDK from hypothetical demand. Require either one
  operator session or two law proposals from that ecosystem.
- Keep the public-beta status explicit until the two comprehension sessions and
  one webhook session have been recorded; repository visibility is not evidence
  that these checks passed.
