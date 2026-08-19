# Third-party test fixtures

`opentelemetry-events.json` is copied unchanged from
[`open-telemetry/opentelemetry-proto/examples/events.json`](https://github.com/open-telemetry/opentelemetry-proto/blob/b5947908941290bfa11cec2abf714e700412b5d7/examples/events.json)
at commit `b5947908941290bfa11cec2abf714e700412b5d7`.

The upstream repository licenses the fixture under Apache License 2.0. It is
included only in the test tree and is not part of the npm package.

`opentelemetry-sdk-events.json` was captured from an actual local OTLP/HTTP
request produced by the official JavaScript packages:

- `@opentelemetry/api-logs@0.221.0`;
- `@opentelemetry/sdk-logs@0.221.0`;
- `@opentelemetry/exporter-logs-otlp-http@0.221.0`;
- `@opentelemetry/resources@2.10.0`;
- `@opentelemetry/semantic-conventions@1.38.0`.

The generator emitted two named events from different instrumentation scopes
and one ordinary log, using fixed source and observed timestamps. A local HTTP
server captured the exporter's `application/json` request body. This fixture is
project-generated evidence, not an upstream source copy.

`opentelemetry-collector-events.json` contains the same SDK batch after it passed
through the official `otel/opentelemetry-collector:0.157.0` container image,
digest
`sha256:4019ce4d7e7791a1a255fffb2f407af66d5017cc65543469ba565c4f47f795b8`.
The Collector used an OTLP/HTTP receiver and the stable `otlp_http` exporter with
JSON encoding, compression disabled, and no processors. A local server captured
the forwarded request.

The Collector omitted default zero counts and empty attribute arrays, and
serialized the SDK's numeric `intValue: 0` as the canonical decimal string
`"0"`. The resulting `TraceEvent` conversion is intentionally identical to the
direct SDK fixture.

`opentelemetry-multi-resource-events.json` was produced by the same isolated
official JavaScript package set, with `@opentelemetry/api@1.9.1` made explicit.
Two independent `LoggerProvider` instances represented `checkout-api` and
`fulfillment-worker`, each with its own resource and OTLP/HTTP exporter. Both
sent one deterministic Event to Collector 0.157.0.

The Collector batch processor used `send_batch_size: 2` and exported one JSON
request containing two `resourceLogs`. The Events share trace ID
`4bf92f3577b34da6a3ce929d0e0e4736`, use different span IDs, and carry sampled
trace `flags: 1`. The fixed IDs are test values and contain no production data.
