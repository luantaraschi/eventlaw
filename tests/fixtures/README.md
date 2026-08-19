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
