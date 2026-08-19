import { describe, expect, test } from 'vitest'
import {
  atMostOnce,
  createMonitor,
  defineLaws,
  event,
  monitoringProfile,
  verifyTrace,
  type TraceEvent,
} from '../src/index.js'

describe('windowed uniqueness', () => {
  const laws = defineLaws({
    deduplicates: atMostOnce(event('delivery')).per('id').partitionBy('endpoint').within(5_000),
  })

  test('fails a duplicate exactly at the inclusive window boundary', () => {
    const trace: TraceEvent[] = [
      { type: 'delivery', endpoint: 'a', id: 'd1', at: 1_000 },
      { type: 'delivery', endpoint: 'a', id: 'd1', at: 6_000 },
    ]

    const report = verifyTrace(trace, laws)

    expect(report.status).toBe('fail')
    expect(report.results[0]?.violations[0]).toMatchObject({ eventIndexes: [0, 1] })
    expect(report.results[0]?.violations[0]?.message).toContain('within 5000ms')
  })

  test('allows a key after the window and uses it as the new reference', () => {
    const passing: TraceEvent[] = [
      { type: 'delivery', endpoint: 'a', id: 'd1', at: 1_000 },
      { type: 'delivery', endpoint: 'a', id: 'd1', at: 6_001 },
    ]
    const slidingFailure: TraceEvent[] = [
      ...passing,
      { type: 'delivery', endpoint: 'a', id: 'd1', at: 10_000 },
    ]

    expect(verifyTrace(passing, laws).status).toBe('pass')
    expect(verifyTrace(slidingFailure, laws).results[0]?.violations[0]?.eventIndexes).toEqual([
      1, 2,
    ])
  })

  test('expires online state only after the inclusive boundary', () => {
    const monitor = createMonitor(laws)
    monitor.push({ type: 'delivery', endpoint: 'a', id: 'd1', at: 1_000 })

    monitor.advanceTo(6_000)
    expect(monitor.stats().retainedEntries).toBe(1)

    monitor.advanceTo(6_001)
    expect(monitor.stats().retainedEntries).toBe(0)
  })

  test('validates the window', () => {
    expect(() => atMostOnce(event('delivery')).per('id').within(-1)).toThrow(/non-negative/)
    expect(() => atMostOnce(event('delivery')).per('id').within(Number.POSITIVE_INFINITY)).toThrow(
      /finite/,
    )
  })
})

describe('scope-reset uniqueness', () => {
  const laws = defineLaws({
    oneChargePerBatch: atMostOnce(event('charge'))
      .per('id')
      .resetOn(event('batch.closed'))
      .partitionBy('batch'),
  })

  test('allows reuse after a reset in the same partition', () => {
    const trace: TraceEvent[] = [
      { type: 'charge', batch: 'b1', id: 'c1', at: 1 },
      { type: 'batch.closed', batch: 'b1', at: 2 },
      { type: 'charge', batch: 'b1', id: 'c1', at: 3 },
    ]

    expect(verifyTrace(trace, laws).status).toBe('pass')

    const monitor = createMonitor(laws)
    for (const item of trace) monitor.push(item)
    expect(monitor.complete()).toEqual(verifyTrace(trace, laws))
    expect(monitor.stats().retainedEntries).toBe(1)
  })

  test('does not reset another partition', () => {
    const trace: TraceEvent[] = [
      { type: 'charge', batch: 'b1', id: 'c1', at: 1 },
      { type: 'batch.closed', batch: 'b2', at: 2 },
      { type: 'charge', batch: 'b1', id: 'c1', at: 3 },
    ]

    expect(verifyTrace(trace, laws).status).toBe('fail')
  })

  test('processes reset before a target on the same event', () => {
    const sameEventLaws = defineLaws({
      reusable: atMostOnce(event('item')).per('id').resetOn(event('item').equals('reset', true)),
    })
    const trace: TraceEvent[] = [
      { type: 'item', id: 'i1', reset: false, at: 1 },
      { type: 'item', id: 'i1', reset: true, at: 2 },
    ]

    expect(verifyTrace(trace, sameEventLaws).status).toBe('pass')
  })
})

test('memory profiles reflect the selected uniqueness retention', () => {
  const laws = defineLaws({
    forever: atMostOnce(event('a')).per('id'),
    windowed: atMostOnce(event('b')).per('id').within(60_000),
    scoped: atMostOnce(event('c')).per('id').resetOn(event('scope.closed')),
  })

  expect(monitoringProfile(laws).map(({ name, memory }) => [name, memory])).toEqual([
    ['forever', 'unbounded'],
    ['windowed', 'window-bounded'],
    ['scoped', 'scope-bounded'],
  ])
  expect(JSON.parse(JSON.stringify(laws))).toEqual(laws)
})
