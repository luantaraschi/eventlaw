export type TraceEvent = {
  type: string
  at: number
  [field: string]: unknown
}

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export type CaptureRef = {
  kind: 'captureRef'
  name: string
}

export type MatcherConstraint =
  | { kind: 'equals'; path: string; value: JsonValue | CaptureRef }
  | { kind: 'contains'; path: string; value: JsonValue | CaptureRef }

export type MatcherCapture = {
  name: string
  path: string
}

export type EventMatcherAst = {
  kind: 'event'
  type: string
  constraints: MatcherConstraint[]
  captures: MatcherCapture[]
}

type LawBase = {
  name: string
  partitionBy?: string
}

export type EventuallyLaw = LawBase & {
  kind: 'eventually'
  trigger: EventMatcherAst
  consequent: EventMatcherAst
  withinMs: number
}

export type NeverBetweenLaw = LawBase & {
  kind: 'neverBetween'
  forbidden: EventMatcherAst
  start: EventMatcherAst
  end: EventMatcherAst
}

export type UniquenessRetention =
  | { kind: 'forever' }
  | { kind: 'within'; windowMs: number }
  | { kind: 'resetOn'; reset: EventMatcherAst }

export type AtMostOnceLaw = LawBase & {
  kind: 'atMostOnce'
  target: EventMatcherAst
  keyPath: string
  each: boolean
  retention: UniquenessRetention
}

export type Law = EventuallyLaw | NeverBetweenLaw | AtMostOnceLaw
export type AnonymousLaw =
  Omit<EventuallyLaw, 'name'> | Omit<NeverBetweenLaw, 'name'> | Omit<AtMostOnceLaw, 'name'>

export type LawStatus = 'pass' | 'fail' | 'pending'

export type LawViolation = {
  law: string
  message: string
  at: number
  eventIndexes: number[]
  partition?: unknown
}

export type LawResult = {
  name: string
  status: LawStatus
  vacuous: boolean
  warnings: string[]
  violations: LawViolation[]
}

export type VerificationReport = {
  status: LawStatus
  now: number
  complete: boolean
  traceLength: number
  results: LawResult[]
}

export type VerificationOptions = {
  now?: number
  complete?: boolean
}

export type MinimizedFailure = {
  law: string
  trace: TraceEvent[]
  report: VerificationReport
  removed: number
}

export type MonitorUpdate = {
  kind: 'event' | 'complete'
  report: VerificationReport
  event?: TraceEvent
}

export type MonitorMemoryClass = 'window-bounded' | 'scope-bounded' | 'unbounded'

export type MonitorLawProfile = {
  name: string
  kind: Law['kind']
  memory: MonitorMemoryClass
  reason: string
}

export type MonitorLawStats = MonitorLawProfile & {
  retainedEntries: number
  terminal: boolean
}

export type MonitorStats = {
  now: number
  eventsProcessed: number
  retainedEntries: number
  laws: MonitorLawStats[]
}
