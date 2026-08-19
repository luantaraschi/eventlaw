import { matchEvent } from './matcher.js'
import { readPath, stableKey } from './path.js'
import type {
  AtMostOnceLaw,
  EventuallyLaw,
  Law,
  LawResult,
  LawStatus,
  LawViolation,
  NeverBetweenLaw,
  TraceEvent,
  VerificationOptions,
  VerificationReport,
} from './types.js'

type IndexedEvent = {
  event: TraceEvent
  index: number
}

type Partition = {
  value: unknown
  events: IndexedEvent[]
}

export function verifyTrace(
  trace: readonly TraceEvent[],
  laws: readonly Law[],
  options: VerificationOptions = {},
): VerificationReport {
  validateTrace(trace)
  validateLawNames(laws)

  const lastAt = trace.at(-1)?.at ?? 0
  const now = options.now ?? lastAt
  if (!Number.isFinite(now) || now < lastAt) {
    throw new Error(`now (${now}) must be finite and at least the last event timestamp (${lastAt})`)
  }
  const complete = options.complete ?? true

  const results = laws.map((law) => evaluateLaw(trace, law, now, complete))
  return {
    status: overallStatus(results.map((result) => result.status)),
    now,
    complete,
    traceLength: trace.length,
    results,
  }
}

function validateTrace(trace: readonly TraceEvent[]): void {
  let previous = Number.NEGATIVE_INFINITY
  for (const [index, event] of trace.entries()) {
    if (typeof event.type !== 'string' || event.type.length === 0) {
      throw new Error(`trace event ${index} has no event type`)
    }
    if (!Number.isFinite(event.at)) {
      throw new Error(`trace event ${index} has a non-finite timestamp`)
    }
    if (event.at < previous) {
      throw new Error(`trace timestamps decrease at event ${index}: ${event.at} < ${previous}`)
    }
    previous = event.at
  }
}

function validateLawNames(laws: readonly Law[]): void {
  const names = new Set<string>()
  for (const law of laws) {
    if (names.has(law.name)) throw new Error(`law name ${JSON.stringify(law.name)} is duplicated`)
    names.add(law.name)
  }
}

function evaluateLaw(
  trace: readonly TraceEvent[],
  law: Law,
  now: number,
  complete: boolean,
): LawResult {
  switch (law.kind) {
    case 'eventually':
      return evaluateEventually(trace, law, now, complete)
    case 'neverBetween':
      return evaluateNeverBetween(trace, law)
    case 'atMostOnce':
      return evaluateAtMostOnce(trace, law)
  }
}

function partitions(trace: readonly TraceEvent[], path?: string): Partition[] {
  if (path === undefined) {
    return [{ value: undefined, events: trace.map((event, index) => ({ event, index })) }]
  }

  const grouped = new Map<string, Partition>()
  for (const [index, event] of trace.entries()) {
    const value = readPath(event, path)
    const key = stableKey(value)
    const current = grouped.get(key)
    if (current === undefined) {
      grouped.set(key, { value, events: [{ event, index }] })
    } else {
      current.events.push({ event, index })
    }
  }
  return [...grouped.values()]
}

function evaluateEventually(
  trace: readonly TraceEvent[],
  law: EventuallyLaw,
  now: number,
  complete: boolean,
): LawResult {
  const violations: LawViolation[] = []
  let triggers = 0
  let pending = 0

  for (const partition of partitions(trace, law.partitionBy)) {
    for (const [position, indexed] of partition.events.entries()) {
      const bindings = matchEvent(indexed.event, law.trigger)
      if (bindings === null) continue
      triggers += 1

      const deadline = indexed.event.at + law.withinMs
      const consequence = partition.events
        .slice(position + 1)
        .find((candidate) => matchEvent(candidate.event, law.consequent, bindings) !== null)

      if (consequence !== undefined && consequence.event.at <= deadline) continue

      if (consequence !== undefined) {
        violations.push(
          makeViolation(
            law,
            partition.value,
            consequence.event.at,
            [indexed.index, consequence.index],
            `consequent ${law.consequent.type} arrived ${consequence.event.at - deadline}ms after its deadline`,
          ),
        )
        continue
      }

      if (complete || now >= deadline) {
        violations.push(
          makeViolation(
            law,
            partition.value,
            deadline,
            [indexed.index],
            `no ${law.consequent.type} arrived within ${law.withinMs}ms of ${law.trigger.type}`,
          ),
        )
      } else {
        pending += 1
      }
    }
  }

  const vacuous = triggers === 0
  return {
    name: law.name,
    status: violations.length > 0 ? 'fail' : pending > 0 ? 'pending' : 'pass',
    vacuous,
    warnings: vacuous
      ? [`law ${law.name} passed vacuously: ${law.trigger.type} never occurred`]
      : [],
    violations,
  }
}

function evaluateNeverBetween(trace: readonly TraceEvent[], law: NeverBetweenLaw): LawResult {
  const violations: LawViolation[] = []
  let starts = 0

  for (const partition of partitions(trace, law.partitionBy)) {
    let openIndex: number | null = null

    for (const indexed of partition.events) {
      if (matchEvent(indexed.event, law.end) !== null) openIndex = null

      if (matchEvent(indexed.event, law.start) !== null) {
        starts += 1
        openIndex = indexed.index
      }

      if (openIndex !== null && matchEvent(indexed.event, law.forbidden) !== null) {
        violations.push(
          makeViolation(
            law,
            partition.value,
            indexed.event.at,
            [openIndex, indexed.index],
            `${law.forbidden.type} occurred between ${law.start.type} and ${law.end.type}`,
          ),
        )
      }
    }
  }

  const vacuous = starts === 0
  return {
    name: law.name,
    status: violations.length > 0 ? 'fail' : 'pass',
    vacuous,
    warnings: vacuous ? [`law ${law.name} passed vacuously: ${law.start.type} never occurred`] : [],
    violations,
  }
}

function evaluateAtMostOnce(trace: readonly TraceEvent[], law: AtMostOnceLaw): LawResult {
  const violations: LawViolation[] = []
  let matches = 0

  for (const partition of partitions(trace, law.partitionBy)) {
    const seen = new Map<string, { index: number; at: number }>()

    for (const indexed of partition.events) {
      if (
        law.retention.kind === 'resetOn' &&
        matchEvent(indexed.event, law.retention.reset) !== null
      ) {
        seen.clear()
      }

      if (matchEvent(indexed.event, law.target) === null) continue
      matches += 1
      const value = readPath(indexed.event, law.keyPath)

      if (value === undefined) {
        violations.push(
          makeViolation(
            law,
            partition.value,
            indexed.event.at,
            [indexed.index],
            `${law.target.type} is missing uniqueness key ${law.keyPath}`,
          ),
        )
        continue
      }

      const values = law.each ? (Array.isArray(value) ? value : null) : [value]
      if (values === null) {
        violations.push(
          makeViolation(
            law,
            partition.value,
            indexed.event.at,
            [indexed.index],
            `${law.target.type}.${law.keyPath} must be an array for perEach`,
          ),
        )
        continue
      }

      for (const keyValue of values) {
        const key = stableKey(keyValue)
        const first = seen.get(key)
        if (first === undefined) {
          seen.set(key, { index: indexed.index, at: indexed.event.at })
        } else if (
          law.retention.kind === 'within' &&
          indexed.event.at - first.at > law.retention.windowMs
        ) {
          seen.set(key, { index: indexed.index, at: indexed.event.at })
        } else {
          violations.push(
            makeViolation(
              law,
              partition.value,
              indexed.event.at,
              [first.index, indexed.index],
              uniquenessMessage(law, keyValue),
            ),
          )
          if (law.retention.kind === 'within') {
            seen.set(key, { index: indexed.index, at: indexed.event.at })
          }
        }
      }
    }
  }

  const vacuous = matches === 0
  return {
    name: law.name,
    status: violations.length > 0 ? 'fail' : 'pass',
    vacuous,
    warnings: vacuous
      ? [`law ${law.name} passed vacuously: ${law.target.type} never occurred`]
      : [],
    violations,
  }
}

function uniquenessMessage(law: AtMostOnceLaw, keyValue: unknown): string {
  const base = `${law.keyPath} value ${JSON.stringify(keyValue)} occurred more than once`
  return law.retention.kind === 'within' ? `${base} within ${law.retention.windowMs}ms` : base
}

function makeViolation(
  law: Law,
  partition: unknown,
  at: number,
  eventIndexes: number[],
  message: string,
): LawViolation {
  const base = { law: law.name, message, at, eventIndexes }
  return law.partitionBy === undefined ? base : { ...base, partition }
}

function overallStatus(statuses: readonly LawStatus[]): LawStatus {
  if (statuses.includes('fail')) return 'fail'
  if (statuses.includes('pending')) return 'pending'
  return 'pass'
}
