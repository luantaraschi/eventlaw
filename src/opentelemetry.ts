import type { JsonValue, TraceEvent } from './types.js'

type UnknownRecord = Record<string, unknown>

export type OtlpEventConversion = {
  trace: TraceEvent[]
  skippedLogRecords: number
}

export class OtlpEventError extends Error {
  readonly path: string

  constructor(path: string, detail: string) {
    super(`${path}: ${detail}`)
    this.name = 'OtlpEventError'
    this.path = path
  }
}

export function eventsFromOtlpJson(input: unknown): OtlpEventConversion {
  const root = expectRecord(input, '$')
  const trace: TraceEvent[] = []
  let skippedLogRecords = 0

  for (const [resourceIndex, resourceValue] of optionalArray(
    root.resourceLogs,
    '$.resourceLogs',
  ).entries()) {
    const resourcePath = `$.resourceLogs[${resourceIndex}]`
    const resourceLog = expectRecord(resourceValue, resourcePath)
    const resource = optionalRecord(resourceLog.resource, `${resourcePath}.resource`)
    const resourceAttributes = decodeAttributes(
      resource.attributes,
      `${resourcePath}.resource.attributes`,
    )

    for (const [scopeIndex, scopeValue] of optionalArray(
      resourceLog.scopeLogs,
      `${resourcePath}.scopeLogs`,
    ).entries()) {
      const scopePath = `${resourcePath}.scopeLogs[${scopeIndex}]`
      const scopeLog = expectRecord(scopeValue, scopePath)
      const scope = optionalRecord(scopeLog.scope, `${scopePath}.scope`)
      const scopeMetadata = decodeScope(scope, `${scopePath}.scope`)

      for (const [recordIndex, recordValue] of optionalArray(
        scopeLog.logRecords,
        `${scopePath}.logRecords`,
      ).entries()) {
        const recordPath = `${scopePath}.logRecords[${recordIndex}]`
        const record = expectRecord(recordValue, recordPath)

        if (record.eventName === undefined || record.eventName === '') {
          skippedLogRecords += 1
          continue
        }
        if (typeof record.eventName !== 'string') {
          throw new OtlpEventError(`${recordPath}.eventName`, 'expected a string')
        }

        trace.push(
          decodeEvent(record, recordPath, record.eventName, resourceAttributes, scopeMetadata),
        )
      }
    }
  }

  return { trace, skippedLogRecords }
}

function decodeEvent(
  record: UnknownRecord,
  path: string,
  eventName: string,
  resource: Record<string, JsonValue>,
  scope: Record<string, JsonValue>,
): TraceEvent {
  const sourceNano = optionalUint64(record.timeUnixNano, `${path}.timeUnixNano`)
  const observedNano = optionalUint64(record.observedTimeUnixNano, `${path}.observedTimeUnixNano`)
  const selectedNano = sourceNano ?? observedNano
  if (selectedNano === undefined) {
    throw new OtlpEventError(path, 'event requires timeUnixNano or observedTimeUnixNano')
  }

  const otel: Record<string, JsonValue> = {
    timestampSource: sourceNano === undefined ? 'observedTimeUnixNano' : 'timeUnixNano',
    attributes: decodeAttributes(record.attributes, `${path}.attributes`),
    resource,
    scope,
  }

  copyString(record, 'traceId', otel, path)
  copyString(record, 'spanId', otel, path)
  copyUint32(record, 'flags', otel, path)
  copyString(record, 'severityText', otel, path)
  copyFiniteNumber(record, 'severityNumber', otel, path)

  if (sourceNano !== undefined) otel.timeUnixNano = sourceNano.toString()
  if (observedNano !== undefined) {
    otel.observedTimeUnixNano = observedNano.toString()
    otel.observedAt = nanosToMilliseconds(observedNano, `${path}.observedTimeUnixNano`)
  }

  const event: TraceEvent = {
    type: eventName,
    at: nanosToMilliseconds(selectedNano, path),
    otel,
  }

  if (record.body !== undefined) {
    const body = expectRecord(record.body, `${path}.body`)
    if (Object.keys(body).length > 0) event.body = decodeAnyValue(body, `${path}.body`)
  }
  return event
}

function decodeScope(scope: UnknownRecord, path: string): Record<string, JsonValue> {
  const result: Record<string, JsonValue> = {
    attributes: decodeAttributes(scope.attributes, `${path}.attributes`),
  }
  copyString(scope, 'name', result, path)
  copyString(scope, 'version', result, path)
  return result
}

function decodeAttributes(value: unknown, path: string): Record<string, JsonValue> {
  const flat = new Map<string, JsonValue>()
  for (const [index, item] of optionalArray(value, path).entries()) {
    const itemPath = `${path}[${index}]`
    const entry = expectRecord(item, itemPath)
    if (typeof entry.key !== 'string' || entry.key.length === 0) {
      throw new OtlpEventError(`${itemPath}.key`, 'expected a non-empty string')
    }
    if (flat.has(entry.key)) {
      throw new OtlpEventError(
        `${itemPath}.key`,
        `duplicate attribute ${JSON.stringify(entry.key)}`,
      )
    }
    if (entry.value === undefined) {
      throw new OtlpEventError(`${itemPath}.value`, 'expected an AnyValue')
    }
    flat.set(entry.key, decodeAnyValue(entry.value, `${itemPath}.value`))
  }

  const keys = [...flat.keys()]
  for (const [index, key] of keys.entries()) {
    for (const other of keys.slice(index + 1)) {
      if (key.startsWith(`${other}.`) || other.startsWith(`${key}.`)) {
        throw new OtlpEventError(path, `attribute namespace collision between ${key} and ${other}`)
      }
    }
  }

  const result: Record<string, JsonValue> = {}
  for (const [key, item] of flat) setNested(result, key.split('.'), item, path)
  return result
}

function decodeAnyValue(value: unknown, path: string): JsonValue {
  const anyValue = expectRecord(value, path)
  const variants = [
    'stringValue',
    'boolValue',
    'intValue',
    'doubleValue',
    'arrayValue',
    'kvlistValue',
    'bytesValue',
  ].filter((key) => anyValue[key] !== undefined)

  if (variants.length !== 1) {
    throw new OtlpEventError(path, 'expected exactly one recognized AnyValue variant')
  }

  const variant = variants[0]!
  const inner = anyValue[variant]
  switch (variant) {
    case 'stringValue':
    case 'bytesValue':
      if (typeof inner !== 'string') {
        throw new OtlpEventError(`${path}.${variant}`, 'expected a string')
      }
      return inner
    case 'boolValue':
      if (typeof inner !== 'boolean') {
        throw new OtlpEventError(`${path}.${variant}`, 'expected a boolean')
      }
      return inner
    case 'doubleValue':
      if (typeof inner !== 'number' || !Number.isFinite(inner)) {
        throw new OtlpEventError(`${path}.${variant}`, 'expected a finite number')
      }
      return inner
    case 'intValue':
      return decodeInt64(inner, `${path}.intValue`)
    case 'arrayValue': {
      const array = expectRecord(inner, `${path}.arrayValue`)
      return optionalArray(array.values, `${path}.arrayValue.values`).map((item, index) =>
        decodeAnyValue(item, `${path}.arrayValue.values[${index}]`),
      )
    }
    case 'kvlistValue': {
      const list = expectRecord(inner, `${path}.kvlistValue`)
      return decodeKeyValueList(list.values, `${path}.kvlistValue.values`)
    }
  }

  throw new OtlpEventError(path, 'unsupported AnyValue variant')
}

function decodeKeyValueList(value: unknown, path: string): Record<string, JsonValue> {
  const result: Record<string, JsonValue> = {}
  for (const [index, item] of optionalArray(value, path).entries()) {
    const itemPath = `${path}[${index}]`
    const entry = expectRecord(item, itemPath)
    if (typeof entry.key !== 'string' || entry.key.length === 0) {
      throw new OtlpEventError(`${itemPath}.key`, 'expected a non-empty string')
    }
    if (Object.hasOwn(result, entry.key)) {
      throw new OtlpEventError(`${itemPath}.key`, `duplicate key ${JSON.stringify(entry.key)}`)
    }
    if (entry.value === undefined) {
      throw new OtlpEventError(`${itemPath}.value`, 'expected an AnyValue')
    }
    defineOwn(result, entry.key, decodeAnyValue(entry.value, `${itemPath}.value`))
  }
  return result
}

function decodeInt64(value: unknown, path: string): JsonValue {
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    (typeof value === 'string' && !/^-?(0|[1-9]\d*)$/.test(value)) ||
    (typeof value === 'number' && !Number.isSafeInteger(value))
  ) {
    throw new OtlpEventError(path, 'expected an int64 decimal string or safe integer')
  }

  const integer = BigInt(value)
  const number = Number(integer)
  return Number.isSafeInteger(number) ? number : integer.toString()
}

function optionalUint64(value: unknown, path: string): bigint | undefined {
  if (value === undefined || value === '0' || value === 0) return undefined
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    (typeof value === 'string' && !/^(0|[1-9]\d*)$/.test(value)) ||
    (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0))
  ) {
    throw new OtlpEventError(path, 'expected a uint64 decimal string or safe integer')
  }
  return BigInt(value)
}

function nanosToMilliseconds(value: bigint, path: string): number {
  const milliseconds = value / 1_000_000n
  const number = Number(milliseconds)
  if (!Number.isSafeInteger(number)) {
    throw new OtlpEventError(path, 'timestamp is outside the safe millisecond range')
  }
  return number
}

function setNested(
  target: Record<string, JsonValue>,
  segments: string[],
  value: JsonValue,
  path: string,
): void {
  let current = target
  for (const [index, segment] of segments.entries()) {
    if (segment.length === 0) {
      throw new OtlpEventError(path, 'attribute keys cannot contain empty path segments')
    }
    if (index === segments.length - 1) {
      defineOwn(current, segment, value)
      return
    }

    const existing = current[segment]
    if (existing === undefined) {
      const child: Record<string, JsonValue> = {}
      defineOwn(current, segment, child)
      current = child
    } else {
      current = existing as Record<string, JsonValue>
    }
  }
}

function defineOwn(target: Record<string, JsonValue>, key: string, value: JsonValue): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  })
}

function copyString(
  source: UnknownRecord,
  key: string,
  target: Record<string, JsonValue>,
  path: string,
): void {
  const value = source[key]
  if (value === undefined) return
  if (typeof value !== 'string') {
    throw new OtlpEventError(`${path}.${key}`, 'expected a string')
  }
  target[key] = value
}

function copyFiniteNumber(
  source: UnknownRecord,
  key: string,
  target: Record<string, JsonValue>,
  path: string,
): void {
  const value = source[key]
  if (value === undefined) return
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new OtlpEventError(`${path}.${key}`, 'expected a finite number')
  }
  target[key] = value
}

function copyUint32(
  source: UnknownRecord,
  key: string,
  target: Record<string, JsonValue>,
  path: string,
): void {
  const value = source[key]
  if (value === undefined) return
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new OtlpEventError(`${path}.${key}`, 'expected a uint32')
  }
  target[key] = value
}

function expectRecord(value: unknown, path: string): UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new OtlpEventError(path, 'expected an object')
  }
  return value as UnknownRecord
}

function optionalRecord(value: unknown, path: string): UnknownRecord {
  return value === undefined ? {} : expectRecord(value, path)
}

function optionalArray(value: unknown, path: string): unknown[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new OtlpEventError(path, 'expected an array')
  return value
}
