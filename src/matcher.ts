import { readPath } from './path.js'
import type {
  CaptureRef,
  EventMatcherAst,
  JsonValue,
  MatcherConstraint,
  TraceEvent,
} from './types.js'

type Bindings = Record<string, unknown>

export class EventPattern {
  readonly ast: EventMatcherAst

  constructor(ast: EventMatcherAst) {
    this.ast = ast
  }

  equals(path: string, value: JsonValue | CaptureRef): EventPattern {
    return this.withConstraint({ kind: 'equals', path, value })
  }

  contains(path: string, value: JsonValue | CaptureRef): EventPattern {
    return this.withConstraint({ kind: 'contains', path, value })
  }

  capture(name: string, path: string): EventPattern {
    if (this.ast.captures.some((capture) => capture.name === name)) {
      throw new Error(`capture ${JSON.stringify(name)} is already defined on this matcher`)
    }
    return new EventPattern({
      ...this.ast,
      captures: [...this.ast.captures, { name, path }],
    })
  }

  private withConstraint(constraint: MatcherConstraint): EventPattern {
    return new EventPattern({
      ...this.ast,
      constraints: [...this.ast.constraints, constraint],
    })
  }
}

export function event(type: string): EventPattern {
  if (type.length === 0) throw new Error('event type cannot be empty')
  return new EventPattern({ kind: 'event', type, constraints: [], captures: [] })
}

export function ref(name: string): CaptureRef {
  if (name.length === 0) throw new Error('capture reference cannot be empty')
  return { kind: 'captureRef', name }
}

function isCaptureRef(value: unknown): value is CaptureRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Partial<CaptureRef>).kind === 'captureRef' &&
    typeof (value as Partial<CaptureRef>).name === 'string'
  )
}

function resolve(
  value: JsonValue | CaptureRef,
  bindings: Bindings,
): { found: boolean; value: unknown } {
  if (!isCaptureRef(value)) return { found: true, value }
  if (!(value.name in bindings)) return { found: false, value: undefined }
  return { found: true, value: bindings[value.name] }
}

export function matchEvent(
  candidate: TraceEvent,
  matcher: EventMatcherAst,
  inherited: Bindings = {},
): Bindings | null {
  if (candidate.type !== matcher.type) return null

  for (const constraint of matcher.constraints) {
    const actual = readPath(candidate, constraint.path)
    if (actual === undefined) return null

    const expected = resolve(constraint.value, inherited)
    if (!expected.found) return null

    if (constraint.kind === 'equals' && !Object.is(actual, expected.value)) return null
    if (
      constraint.kind === 'contains' &&
      (!Array.isArray(actual) || !actual.some((item) => Object.is(item, expected.value)))
    ) {
      return null
    }
  }

  const bindings: Bindings = { ...inherited }
  for (const capture of matcher.captures) {
    const captured = readPath(candidate, capture.path)
    if (captured === undefined) return null
    bindings[capture.name] = captured
  }

  return bindings
}
