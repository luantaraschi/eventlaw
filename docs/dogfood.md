# Maintainer dogfood protocol

The first beta candidate is tested in maintainer-owned projects before external
sessions. This phase validates packaging, modeling, and operating fit. It does
not validate whether an unfamiliar developer can understand the API.

## Targets

Use at least two independent consumers:

1. `lull`, using its real reducer events and existing reliability rules;
2. one other maintainer-owned event-driven project with a trace that was not
   invented for Eventlaw.

Install the packed artifact as a consumer would. Do not import Eventlaw source
files through relative workspace paths.

## Coverage matrix

Across the two projects, exercise every execution mode at least once:

| Mode      | Minimum evidence                                                      |
| --------- | --------------------------------------------------------------------- |
| Generated | A real command model and a shrunk generated failure or clean run      |
| Recorded  | A JSONL or OTLP/JSON trace mapped without changing semantic ordering  |
| Live      | A monitor fed incrementally, including explicit silent time if needed |

Use at least three real laws in total. Include progress, exclusion, and one
uniqueness retention policy when those rules genuinely exist in the projects.
Do not manufacture a business rule only to fill the matrix.

## What to record

Store sanitized evidence under
`docs/dogfood-results/YYYY-MM-DD-<project>.md`. Create one record per law or
integration:

```md
### <project> — <law name>

- Project revision:
- Rule in plain language:
- Event source and mapping:
- Execution mode:
- Law definition:
- Expected result:
- Observed result:
- Minimal counterexample, if any:
- Integration friction:
- Clock, partition, ordering, retention, and restart assumptions:
- Decision: keep / document / fix / propose
```

Remove credentials, customer data, private URLs, and identifying payload values
before storing any trace in this repository.

## Decision rules

- Fix correctness, package, type, or ESM/CommonJS failures immediately.
- Change documentation when one real integration contradicts it.
- Change the API only when the current shape blocks a real law or the same
  confusion appears in two independent examples.
- Add an adapter only when the source boundary, ordering, replay, clock, and
  failure behavior are explicit.
- Keep unsupported wishes as issues; dogfood is not permission to expand the
  beta until it loses a clear center.

## Exit evidence

Dogfood is complete when:

- the packed candidate works in both projects;
- generated, recorded, and live modes have all been exercised;
- at least three genuine laws and their outcomes are recorded;
- every discovered blocker is fixed or explicitly accepted;
- the remaining risks are clear enough to test with external participants.

After this, run the separate [external validation protocol](validation.md).
