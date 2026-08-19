import { matchEvent } from './matcher.js'
import { readPath, stableKey } from './path.js'
import type {
  AtMostOnceLaw,
  EventuallyLaw,
  Law,
  LawResult,
  LawStatus,
  LawViolation,
  MonitorLawProfile,
  MonitorLawStats,
  MonitorStats,
  MonitorUpdate,
  NeverBetweenLaw,
  TraceEvent,
  VerificationReport,
} from './types.js'

type Bindings = Record<string, unknown>

type PendingObligation = {
  bindings: Bindings
  deadline: number
  triggerIndex: number
  partition: unknown
}

type EventuallyState = {
  kind: 'eventually'
  triggers: number
  pending: Map<string, PendingObligation[]>
}

type OpenInterval = {
  startIndex: number
  partition: unknown
}

type NeverBetweenState = {
  kind: 'neverBetween'
  starts: number
  open: Map<string, OpenInterval>
}

type UniquenessPartition = {
  value: unknown
  seen: Map<string, { index: number; at: number }>
}

type AtMostOnceState = {
  kind: 'atMostOnce'
  matches: number
  partitions: Map<string, UniquenessPartition>
}

type LawState = EventuallyState | NeverBetweenState | AtMostOnceState

type LawRuntime = {
  law: Law
  state: LawState
  terminalFailure: LawResult | null
}

export class TraceMonitor {
  private readonly runtimes: LawRuntime[]
  private now: number | null = null
  private eventsProcessed = 0
  private completed = false

  constructor(laws: readonly Law[]) {
    validateLawNames(laws)
    this.runtimes = laws.map((law) => ({
      law,
      state: createState(law),
      terminalFailure: null,
    }))
  }

  push(event: TraceEvent): VerificationReport {
    this.ensureOpen()
    validateEvent(event, this.eventsProcessed)
    if (this.now !== null && event.at < this.now) {
      throw new Error(`event timestamp ${event.at} is behind monitor time ${this.now}`)
    }

    const index = this.eventsProcessed
    this.eventsProcessed += 1
    this.now = event.at

    for (const runtime of this.runtimes) {
      if (runtime.terminalFailure !== null) continue
      if (runtime.law.kind === 'atMostOnce' && runtime.law.retention.kind === 'within') {
        expireUniqueness(runtime.law, runtime.state as AtMostOnceState, event.at)
      }
      const violations = pushToRuntime(runtime, event, index)
      if (runtime.law.kind === 'eventually') {
        violations.push(
          ...expireEventually(runtime.law, runtime.state as EventuallyState, event.at),
        )
      }
      observeFailure(runtime, violations)
    }

    return this.report(false)
  }

  advanceTo(now: number): VerificationReport {
    this.ensureOpen()
    const earliest = this.now ?? 0
    if (!Number.isFinite(now) || now < earliest) {
      throw new Error(`cannot move monitor time backward from ${this.now} to ${now}`)
    }
    this.now = now

    for (const runtime of this.runtimes) {
      if (runtime.terminalFailure !== null) continue
      if (runtime.law.kind === 'eventually') {
        observeFailure(
          runtime,
          expireEventually(runtime.law, runtime.state as EventuallyState, now),
        )
      }
      if (runtime.law.kind === 'atMostOnce' && runtime.law.retention.kind === 'within') {
        expireUniqueness(runtime.law, runtime.state as AtMostOnceState, now)
      }
    }

    return this.report(false)
  }

  complete(): VerificationReport {
    this.ensureOpen()
    this.completed = true

    for (const runtime of this.runtimes) {
      if (runtime.terminalFailure !== null || runtime.law.kind !== 'eventually') continue
      observeFailure(runtime, closeEventually(runtime.law, runtime.state as EventuallyState))
    }

    return this.report(true)
  }

  stats(): MonitorStats {
    const laws = this.runtimes.map(runtimeStats)
    return {
      now: this.now ?? 0,
      eventsProcessed: this.eventsProcessed,
      retainedEntries: laws.reduce((total, law) => total + law.retainedEntries, 0),
      laws,
    }
  }

  private report(complete: boolean): VerificationReport {
    const results = this.runtimes.map(runtimeResult)
    return {
      status: overallStatus(results.map((result) => result.status)),
      now: this.now ?? 0,
      complete,
      traceLength: this.eventsProcessed,
      results,
    }
  }

  private ensureOpen(): void {
    if (this.completed) throw new Error('monitor is already complete')
  }
}

export function createMonitor(laws: readonly Law[]): TraceMonitor {
  return new TraceMonitor(laws)
}

export function monitoringProfile(laws: readonly Law[]): MonitorLawProfile[] {
  validateLawNames(laws)
  return laws.map(profileLaw)
}

export async function* monitorTrace(
  stream: AsyncIterable<TraceEvent>,
  laws: readonly Law[],
): AsyncGenerator<MonitorUpdate> {
  const monitor = createMonitor(laws)

  for await (const event of stream) {
    yield {
      kind: 'event',
      event,
      report: monitor.push(event),
    }
  }

  yield {
    kind: 'complete',
    report: monitor.complete(),
  }
}

function createState(law: Law): LawState {
  switch (law.kind) {
    case 'eventually':
      return { kind: 'eventually', triggers: 0, pending: new Map() }
    case 'neverBetween':
      return { kind: 'neverBetween', starts: 0, open: new Map() }
    case 'atMostOnce':
      return { kind: 'atMostOnce', matches: 0, partitions: new Map() }
  }
}

function pushToRuntime(runtime: LawRuntime, event: TraceEvent, index: number): LawViolation[] {
  switch (runtime.law.kind) {
    case 'eventually':
      return pushEventually(runtime.law, runtime.state as EventuallyState, event, index)
    case 'neverBetween':
      return pushNeverBetween(runtime.law, runtime.state as NeverBetweenState, event, index)
    case 'atMostOnce':
      return pushAtMostOnce(runtime.law, runtime.state as AtMostOnceState, event, index)
  }
}

function pushEventually(
  law: EventuallyLaw,
  state: EventuallyState,
  event: TraceEvent,
  index: number,
): LawViolation[] {
  const violations: LawViolation[] = []
  const partition = partitionOf(event, law.partitionBy)
  const pending = state.pending.get(partition.key) ?? []
  const remaining: PendingObligation[] = []

  for (const obligation of pending) {
    if (matchEvent(event, law.consequent, obligation.bindings) === null) {
      remaining.push(obligation)
      continue
    }

    if (event.at > obligation.deadline) {
      violations.push(
        makeViolation(
          law,
          obligation.partition,
          event.at,
          [obligation.triggerIndex, index],
          `consequent ${law.consequent.type} arrived ${event.at - obligation.deadline}ms after its deadline`,
        ),
      )
    }
  }

  const bindings = matchEvent(event, law.trigger)
  if (bindings !== null) {
    state.triggers += 1
    remaining.push({
      bindings,
      deadline: event.at + law.withinMs,
      triggerIndex: index,
      partition: partition.value,
    })
  }

  if (remaining.length === 0) state.pending.delete(partition.key)
  else state.pending.set(partition.key, remaining)
  return violations
}

function expireEventually(law: EventuallyLaw, state: EventuallyState, now: number): LawViolation[] {
  const violations: LawViolation[] = []

  for (const [partitionKey, obligations] of state.pending) {
    const remaining: PendingObligation[] = []
    for (const obligation of obligations) {
      if (now < obligation.deadline) {
        remaining.push(obligation)
        continue
      }
      violations.push(missingConsequence(law, obligation))
    }

    if (remaining.length === 0) state.pending.delete(partitionKey)
    else state.pending.set(partitionKey, remaining)
  }

  return violations
}

function closeEventually(law: EventuallyLaw, state: EventuallyState): LawViolation[] {
  const violations: LawViolation[] = []
  for (const obligations of state.pending.values()) {
    for (const obligation of obligations) {
      violations.push(missingConsequence(law, obligation))
    }
  }
  state.pending.clear()
  return violations
}

function missingConsequence(law: EventuallyLaw, obligation: PendingObligation): LawViolation {
  return makeViolation(
    law,
    obligation.partition,
    obligation.deadline,
    [obligation.triggerIndex],
    `no ${law.consequent.type} arrived within ${law.withinMs}ms of ${law.trigger.type}`,
  )
}

function pushNeverBetween(
  law: NeverBetweenLaw,
  state: NeverBetweenState,
  event: TraceEvent,
  index: number,
): LawViolation[] {
  const partition = partitionOf(event, law.partitionBy)

  if (matchEvent(event, law.end) !== null) state.open.delete(partition.key)

  if (matchEvent(event, law.start) !== null) {
    state.starts += 1
    state.open.set(partition.key, { startIndex: index, partition: partition.value })
  }

  const interval = state.open.get(partition.key)
  if (interval === undefined || matchEvent(event, law.forbidden) === null) return []

  return [
    makeViolation(
      law,
      interval.partition,
      event.at,
      [interval.startIndex, index],
      `${law.forbidden.type} occurred between ${law.start.type} and ${law.end.type}`,
    ),
  ]
}

function pushAtMostOnce(
  law: AtMostOnceLaw,
  state: AtMostOnceState,
  event: TraceEvent,
  index: number,
): LawViolation[] {
  const partition = partitionOf(event, law.partitionBy)
  let partitionState = state.partitions.get(partition.key)

  if (law.retention.kind === 'resetOn' && matchEvent(event, law.retention.reset) !== null) {
    state.partitions.delete(partition.key)
    partitionState = undefined
  }

  if (matchEvent(event, law.target) === null) return []
  state.matches += 1

  if (partitionState === undefined) {
    partitionState = { value: partition.value, seen: new Map() }
    state.partitions.set(partition.key, partitionState)
  }

  const value = readPath(event, law.keyPath)
  if (value === undefined) {
    return [
      makeViolation(
        law,
        partition.value,
        event.at,
        [index],
        `${law.target.type} is missing uniqueness key ${law.keyPath}`,
      ),
    ]
  }

  const values = law.each ? (Array.isArray(value) ? value : null) : [value]
  if (values === null) {
    return [
      makeViolation(
        law,
        partition.value,
        event.at,
        [index],
        `${law.target.type}.${law.keyPath} must be an array for perEach`,
      ),
    ]
  }

  const violations: LawViolation[] = []
  for (const keyValue of values) {
    const key = stableKey(keyValue)
    const first = partitionState.seen.get(key)
    if (first === undefined) {
      partitionState.seen.set(key, { index, at: event.at })
    } else {
      violations.push(
        makeViolation(
          law,
          partition.value,
          event.at,
          [first.index, index],
          uniquenessMessage(law, keyValue),
        ),
      )
      if (law.retention.kind === 'within') {
        partitionState.seen.set(key, { index, at: event.at })
      }
    }
  }
  return violations
}

function expireUniqueness(law: AtMostOnceLaw, state: AtMostOnceState, now: number): void {
  if (law.retention.kind !== 'within') return

  for (const [partitionKey, partition] of state.partitions) {
    for (const [key, entry] of partition.seen) {
      if (now - entry.at > law.retention.windowMs) partition.seen.delete(key)
    }
    if (partition.seen.size === 0) state.partitions.delete(partitionKey)
  }
}

function runtimeResult(runtime: LawRuntime): LawResult {
  if (runtime.terminalFailure !== null) return runtime.terminalFailure

  switch (runtime.state.kind) {
    case 'eventually': {
      const vacuous = runtime.state.triggers === 0
      return {
        name: runtime.law.name,
        status: retainedEntries(runtime.state) > 0 ? 'pending' : 'pass',
        vacuous,
        warnings: vacuous
          ? [
              `law ${runtime.law.name} passed vacuously: ${(runtime.law as EventuallyLaw).trigger.type} never occurred`,
            ]
          : [],
        violations: [],
      }
    }
    case 'neverBetween': {
      const vacuous = runtime.state.starts === 0
      return {
        name: runtime.law.name,
        status: 'pass',
        vacuous,
        warnings: vacuous
          ? [
              `law ${runtime.law.name} passed vacuously: ${(runtime.law as NeverBetweenLaw).start.type} never occurred`,
            ]
          : [],
        violations: [],
      }
    }
    case 'atMostOnce': {
      const vacuous = runtime.state.matches === 0
      return {
        name: runtime.law.name,
        status: 'pass',
        vacuous,
        warnings: vacuous
          ? [
              `law ${runtime.law.name} passed vacuously: ${(runtime.law as AtMostOnceLaw).target.type} never occurred`,
            ]
          : [],
        violations: [],
      }
    }
  }
}

function observeFailure(runtime: LawRuntime, violations: LawViolation[]): void {
  if (violations.length === 0 || runtime.terminalFailure !== null) return
  runtime.terminalFailure = {
    name: runtime.law.name,
    status: 'fail',
    vacuous: false,
    warnings: [],
    violations,
  }
  releaseState(runtime.state)
}

function releaseState(state: LawState): void {
  switch (state.kind) {
    case 'eventually':
      state.pending.clear()
      return
    case 'neverBetween':
      state.open.clear()
      return
    case 'atMostOnce':
      state.partitions.clear()
  }
}

function runtimeStats(runtime: LawRuntime): MonitorLawStats {
  return {
    ...profileLaw(runtime.law),
    retainedEntries: retainedEntries(runtime.state),
    terminal: runtime.terminalFailure !== null,
  }
}

function retainedEntries(state: LawState): number {
  switch (state.kind) {
    case 'eventually':
      return [...state.pending.values()].reduce((total, pending) => total + pending.length, 0)
    case 'neverBetween':
      return state.open.size
    case 'atMostOnce':
      return [...state.partitions.values()].reduce(
        (total, partition) => total + partition.seen.size,
        0,
      )
  }
}

function profileLaw(law: Law): MonitorLawProfile {
  switch (law.kind) {
    case 'eventually':
      return {
        name: law.name,
        kind: law.kind,
        memory: 'window-bounded',
        reason: 'retains only obligations whose deadlines have not been reached',
      }
    case 'neverBetween':
      return {
        name: law.name,
        kind: law.kind,
        memory: 'scope-bounded',
        reason: 'retains one start per currently open partition',
      }
    case 'atMostOnce':
      switch (law.retention.kind) {
        case 'forever':
          return {
            name: law.name,
            kind: law.kind,
            memory: 'unbounded',
            reason: 'exact uniqueness retains every distinct key until the monitor ends',
          }
        case 'within':
          return {
            name: law.name,
            kind: law.kind,
            memory: 'window-bounded',
            reason: `retains the latest occurrence of each key for ${law.retention.windowMs}ms`,
          }
        case 'resetOn':
          return {
            name: law.name,
            kind: law.kind,
            memory: 'scope-bounded',
            reason: `retains keys until ${law.retention.reset.type} resets their partition`,
          }
      }
  }
}

function partitionOf(event: TraceEvent, partitionBy?: string): { key: string; value: unknown } {
  if (partitionBy === undefined) return { key: 'default', value: undefined }
  const value = readPath(event, partitionBy)
  return { key: stableKey(value), value }
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

function uniquenessMessage(law: AtMostOnceLaw, keyValue: unknown): string {
  const base = `${law.keyPath} value ${JSON.stringify(keyValue)} occurred more than once`
  return law.retention.kind === 'within' ? `${base} within ${law.retention.windowMs}ms` : base
}

function validateEvent(event: TraceEvent, index: number): void {
  if (typeof event.type !== 'string' || event.type.length === 0) {
    throw new Error(`trace event ${index} has no event type`)
  }
  if (!Number.isFinite(event.at)) {
    throw new Error(`trace event ${index} has a non-finite timestamp`)
  }
}

function validateLawNames(laws: readonly Law[]): void {
  const names = new Set<string>()
  for (const law of laws) {
    if (names.has(law.name)) throw new Error(`law name ${JSON.stringify(law.name)} is duplicated`)
    names.add(law.name)
  }
}

function overallStatus(statuses: readonly LawStatus[]): LawStatus {
  if (statuses.includes('fail')) return 'fail'
  if (statuses.includes('pending')) return 'pending'
  return 'pass'
}
