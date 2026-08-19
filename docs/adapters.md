# Adapter strategy

Status: JSONL and structural OTLP/JSON implementations are experimental. OTLP
has been exercised against the protocol fixture, a real JavaScript SDK export,
and the same batch re-exported by a real Collector.

Adapters translate external records into `TraceEvent`. They must not redefine
law semantics, read the wall clock for the core, or make hidden retention
decisions.

## First adapter comparison

| Candidate            | Immediate hypothesis tested                  | Runtime coupling      | Semantic questions before use                         | Decision     |
| -------------------- | -------------------------------------------- | --------------------- | ----------------------------------------------------- | ------------ |
| JSON Lines           | Verify exported or piped recorded traces     | None                  | Input must contain `type` and millisecond `at`        | Build first  |
| OpenTelemetry events | Run laws over a standard telemetry model     | None for OTLP/JSON    | connection, ordering across batches, backpressure     | Experimental |
| Kafka                | Monitor a live broker stream                 | Client and operations | ordering across partitions, offsets, replay, failures | Wait         |
| Test-runner reporter | Surface laws inside an existing test command | Runner-specific       | Vitest/Jest lifecycle and trace ownership             | Wait         |

[JSON Lines](https://jsonlines.org/) is UTF-8 text with one JSON value per line,
which makes it suitable for logs, pipelines, and incremental processing. The
adapter deliberately accepts only objects already shaped as `TraceEvent`; vendor
normalization belongs in a source-specific adapter.

OpenTelemetry became the second adapter after testing the official OTLP/JSON
event fixture. Its stable logs data model has an event name, source timestamp,
observed timestamp, attributes, and resource context. The fixture proved that
generic JSONL is not enough: OTLP is a nested batch, timestamps are uint64
nanosecond strings, semantic attributes use dotted keys, and a body may contain
its own `type`. See the official
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

## OTLP/JSON event contract

`eventlaw/opentelemetry` accepts an already-decoded OTLP/JSON
`ExportLogsServiceRequest`. It has no OpenTelemetry SDK dependency and does not
open a network connection.

```ts
import { eventsFromOtlpJson } from 'eventlaw/opentelemetry'

const { trace, skippedLogRecords } = eventsFromOtlpJson(payload)
```

The conversion is deliberately explicit:

- only `LogRecord` values with a non-empty `eventName` become `TraceEvent`;
  ordinary logs are counted in `skippedLogRecords`;
- `eventName` becomes `type`;
- `timeUnixNano` becomes `at`, falling back to `observedTimeUnixNano` when the
  source timestamp is absent;
- nanoseconds are truncated to integer milliseconds, while their exact decimal
  strings remain in `otel.timeUnixNano` and `otel.observedTimeUnixNano`;
- the decoded AnyValue body stays at `body`, including a body-owned `type`;
- an empty AnyValue object emitted by the JavaScript SDK represents an absent
  body and is omitted;
- record attributes, resource attributes, and instrumentation scope stay under
  `otel.attributes`, `otel.resource`, and `otel.scope`;
- `traceId`, `spanId`, and the OTLP trace `flags` stay under `otel`; flags must be
  a valid uint32 rather than being silently coerced;
- dotted semantic attribute keys become nested objects so existing matcher paths
  remain readable; ambiguous namespace collisions fail instead of overwriting;
- input order is preserved. The adapter never silently sorts batches.

Int64 AnyValues become numbers only inside JavaScript's safe integer range and
otherwise remain decimal strings. Bytes remain their OTLP/JSON base64 strings.
Malformed structures fail with their full OTLP object path.

One test fixture is copied unchanged from the official
[`opentelemetry-proto` event example](https://github.com/open-telemetry/opentelemetry-proto/blob/b5947908941290bfa11cec2abf714e700412b5d7/examples/events.json).
A second fixture was captured from an actual `application/json` request emitted
by `@opentelemetry/sdk-logs@0.221.0` and
`@opentelemetry/exporter-logs-otlp-http@0.221.0`. It contains two named Events
from distinct instrumentation scopes and one ordinary log.

A third fixture passed that SDK request through
`otel/opentelemetry-collector:0.157.0` using the stable `otlp_http` exporter with
JSON encoding. The Collector omitted default zero fields and empty arrays, and
canonicalized numeric `intValue: 0` to `"0"`. Both payloads convert to exactly the
same trace and skipped-log count.

A fourth fixture uses two independent `LoggerProvider` resources to represent a
checkout API and a fulfillment worker. Both exporters send to a Collector batch
processor, which emits one request containing two `resourceLogs`. The Events
share a valid W3C `traceId`, have distinct `spanId` values, retain sampled
`flags: 1`, and pass a law that matches both order identity and trace context.
Changing only the consequence trace ID makes that law fail. This proves
cross-service correlation without treating service identity as a partition.

This is structural conversion only: protobuf, Collector connections,
compression, authentication, backpressure, and ordering across requests remain
outside the adapter. The HTTP exporter was used to produce test evidence, not
added as a package dependency.

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
