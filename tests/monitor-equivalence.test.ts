import fc from 'fast-check'
import { expect, test } from 'vitest'
import {
  after,
  atMostOnce,
  createMonitor,
  defineLaws,
  event,
  never,
  ref,
  verifyTrace,
  type Law,
  type TraceEvent,
  type VerificationReport,
} from '../src/index.js'

const eventType = fc.constantFrom('trigger', 'consequent', 'start', 'end', 'target', 'noise')
const generatedEvent = fc.record({
  type: eventType,
  delta: fc.integer({ min: 0, max: 8 }),
  id: fc.constantFrom('a', 'b', 'c'),
  partition: fc.constantFrom('p1', 'p2'),
})

test('incremental progress is equivalent to finite verification until failure', () => {
  const laws = defineLaws({
    progresses: after(event('trigger').capture('id', 'id'))
      .eventually(event('consequent').equals('id', ref('id')))
      .within(5)
      .partitionBy('partition'),
  })

  fc.assert(
    fc.property(fc.array(generatedEvent, { maxLength: 30 }), (generated) => {
      comparePrefixes(toTrace(generated), laws)
    }),
    { numRuns: 250 },
  )
})

test('incremental exclusion is equivalent to finite verification until failure', () => {
  const laws = defineLaws({
    excludes: never(event('target')).between(event('start'), event('end')).partitionBy('partition'),
  })

  fc.assert(
    fc.property(fc.array(generatedEvent, { maxLength: 30 }), (generated) => {
      comparePrefixes(toTrace(generated), laws)
    }),
    { numRuns: 250 },
  )
})

test('incremental uniqueness is equivalent to finite verification until failure', () => {
  const laws = defineLaws({
    unique: atMostOnce(event('target')).per('id').partitionBy('partition'),
  })

  fc.assert(
    fc.property(fc.array(generatedEvent, { maxLength: 30 }), (generated) => {
      comparePrefixes(toTrace(generated), laws)
    }),
    { numRuns: 250 },
  )
})

test('incremental windowed uniqueness is equivalent to finite verification until failure', () => {
  const laws = defineLaws({
    uniqueWithinWindow: atMostOnce(event('target')).per('id').within(5).partitionBy('partition'),
  })

  fc.assert(
    fc.property(fc.array(generatedEvent, { maxLength: 30 }), (generated) => {
      comparePrefixes(toTrace(generated), laws)
    }),
    { numRuns: 250 },
  )
})

test('incremental reset uniqueness is equivalent to finite verification until failure', () => {
  const laws = defineLaws({
    uniqueWithinScope: atMostOnce(event('target'))
      .per('id')
      .resetOn(event('end'))
      .partitionBy('partition'),
  })

  fc.assert(
    fc.property(fc.array(generatedEvent, { maxLength: 30 }), (generated) => {
      comparePrefixes(toTrace(generated), laws)
    }),
    { numRuns: 250 },
  )
})

function toTrace(
  generated: Array<{ type: string; delta: number; id: string; partition: string }>,
): TraceEvent[] {
  let at = 0
  return generated.map((item) => {
    at += item.delta
    return { type: item.type, at, id: item.id, partition: item.partition }
  })
}

function comparePrefixes(trace: TraceEvent[], laws: Law[]): void {
  const monitor = createMonitor(laws)
  const prefix: TraceEvent[] = []

  for (const item of trace) {
    prefix.push(item)
    const online = canonicalize(monitor.push(item))
    const offline = canonicalize(verifyTrace(prefix, laws, { now: item.at, complete: false }))
    expect(online).toEqual(offline)
    if (online.status === 'fail') break
  }
}

function canonicalize(report: VerificationReport): VerificationReport {
  return {
    ...report,
    results: report.results.map((result) => ({
      ...result,
      violations: [...result.violations].sort((left, right) => {
        const leftKey = `${left.at}:${left.eventIndexes.join(',')}:${left.message}`
        const rightKey = `${right.at}:${right.eventIndexes.join(',')}:${right.message}`
        return leftKey.localeCompare(rightKey)
      }),
    })),
  }
}
