# Adapter strategy

Status: first decision recorded; JSONL implementation is experimental.

Adapters translate external records into `TraceEvent`. They must not redefine
law semantics, read the wall clock for the core, or make hidden retention
decisions.

## First adapter comparison

| Candidate            | Immediate hypothesis tested                  | Runtime coupling       | Semantic questions before use                         | Decision    |
| -------------------- | -------------------------------------------- | ---------------------- | ----------------------------------------------------- | ----------- |
| JSON Lines           | Verify exported or piped recorded traces     | None                   | Input must contain `type` and millisecond `at`        | Build first |
| OpenTelemetry events | Run laws over a standard telemetry model     | Avoidable structurally | nanoseconds, timestamp choice, attributes, resources  | Investigate |
| Kafka                | Monitor a live broker stream                 | Client and operations  | ordering across partitions, offsets, replay, failures | Wait        |
| Test-runner reporter | Surface laws inside an existing test command | Runner-specific        | Vitest/Jest lifecycle and trace ownership             | Wait        |

[JSON Lines](https://jsonlines.org/) is UTF-8 text with one JSON value per line,
which makes it suitable for logs, pipelines, and incremental processing. The
adapter deliberately accepts only objects already shaped as `TraceEvent`; vendor
normalization belongs in a source-specific adapter.

OpenTelemetry is the leading second candidate because its stable logs data model
has an event name, source timestamp, observed timestamp, attributes, and resource
context. That richness is also why a direct mapping should wait for real data:
OpenTelemetry timestamps use nanoseconds while `eventlaw` currently uses numeric
milliseconds, and flattening attributes or resources could create path
collisions. See the official
[logs data model](https://opentelemetry.io/docs/specs/otel/logs/data-model/) and
[event conventions](https://opentelemetry.io/docs/specs/semconv/general/events/).

Kafka is not first because a consumer record adds topic, partition, offset,
timestamp, key, value, headers, and delivery lifecycle. A useful adapter must
state ordering and replay semantics instead of merely importing a client. The
[official consumer-record model](https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/ConsumerRecord.html)
illustrates that additional contract.

## JSONL contract

The `eventlaw/jsonl` subpath provides:

- `parseJsonl(text)` for an in-memory trace;
- `decodeJsonl(chunks)` for incremental async iteration;
- `readJsonl(chunks)` to collect a stream into a finite trace;
- `JsonlTraceError` with source and one-based line information.

It accepts string chunks or UTF-8 byte chunks, including chunks split inside a
multibyte character. One input may not mix those modes. Empty input is an empty
trace; blank lines, byte-order marks, invalid JSON, non-object values, empty event
types, and non-numeric timestamps are errors.

The decoder validates shape, not ordering. `verifyTrace` and `TraceMonitor`
remain the semantic authorities for monotonic time and law evaluation.

```ts
import { createReadStream } from 'node:fs'
import { readJsonl } from 'eventlaw/jsonl'

const trace = await readJsonl(createReadStream('events.jsonl'), {
  source: 'events.jsonl',
})
```

## Persistent uniqueness

Lifetime uniqueness may eventually use an external state store, but a generic
key-value interface does not yet describe enough behavior. A real design must
answer:

- whether check-and-record is atomic across monitor processes;
- how law name, schema version, partition, and key form a namespace;
- whether replaying the same source record is idempotent;
- how reset and window policies interact with stored entries;
- whether store failure blocks, fails the law, or marks the result unknown.

Adding asynchronous storage directly to the dependency-free synchronous core
would widen every monitoring call before these answers exist. The current
decision is to keep the core unchanged and prototype durable uniqueness in a
store-specific adapter only after an operator supplies restart and failure-mode
requirements.
