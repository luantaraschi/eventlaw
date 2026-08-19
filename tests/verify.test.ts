import { describe, expect, test } from 'vitest'
import {
  after,
  atMostOnce,
  defineLaws,
  event,
  never,
  ref,
  verifyTrace,
  type TraceEvent,
} from '../src/index.js'

const laws = defineLaws({
  paymentCompletes: after(event('payment.requested').capture('paymentId', 'id'))
    .eventually(event('payment.captured').equals('id', ref('paymentId')))
    .within(5_000)
    .partitionBy('accountId'),

  noCaptureWhileFrozen: never(event('payment.captured'))
    .between(event('account.frozen'), event('account.unfrozen'))
    .partitionBy('accountId'),

  oneCapturePerPayment: atMostOnce(event('payment.captured')).per('id'),
})

describe('verifyTrace', () => {
  test('passes a correlated consequence at the deadline', () => {
    const trace: TraceEvent[] = [
      { type: 'payment.requested', accountId: 'a1', id: 'p1', at: 1_000 },
      { type: 'payment.captured', accountId: 'a1', id: 'p1', at: 6_000 },
    ]

    const report = verifyTrace(trace, laws, { complete: true })

    expect(report.status).toBe('pass')
    expect(report.results.map((result) => result.status)).toEqual(['pass', 'pass', 'pass'])
    expect(report.results[1]?.vacuous).toBe(true)
  })

  test('keeps an open progress obligation pending', () => {
    const trace: TraceEvent[] = [
      { type: 'payment.requested', accountId: 'a1', id: 'p1', at: 1_000 },
    ]

    const report = verifyTrace(trace, laws, { complete: false, now: 5_999 })

    expect(report.status).toBe('pending')
    expect(report.results[0]?.status).toBe('pending')
  })

  test('fails progress when time reaches the deadline', () => {
    const trace: TraceEvent[] = [
      { type: 'payment.requested', accountId: 'a1', id: 'p1', at: 1_000 },
    ]

    const report = verifyTrace(trace, laws, { complete: false, now: 6_000 })

    expect(report.status).toBe('fail')
    expect(report.results[0]?.violations[0]).toMatchObject({
      law: 'paymentCompletes',
      at: 6_000,
      eventIndexes: [0],
      partition: 'a1',
    })
  })

  test('does not use a consequence from another partition', () => {
    const trace: TraceEvent[] = [
      { type: 'payment.requested', accountId: 'a1', id: 'p1', at: 1_000 },
      { type: 'payment.captured', accountId: 'a2', id: 'p1', at: 2_000 },
    ]

    const report = verifyTrace(trace, laws, { complete: true })

    expect(report.results[0]?.status).toBe('fail')
  })

  test('fails when a forbidden event occurs inside an interval', () => {
    const trace: TraceEvent[] = [
      { type: 'account.frozen', accountId: 'a1', at: 1_000 },
      { type: 'payment.captured', accountId: 'a1', id: 'p1', at: 2_000 },
      { type: 'account.unfrozen', accountId: 'a1', at: 3_000 },
    ]

    const report = verifyTrace(trace, laws, { complete: true })

    expect(report.results[1]?.status).toBe('fail')
    expect(report.results[1]?.violations[0]?.eventIndexes).toEqual([0, 1])
  })

  test('allows the target after the interval closes', () => {
    const trace: TraceEvent[] = [
      { type: 'account.frozen', accountId: 'a1', at: 1_000 },
      { type: 'account.unfrozen', accountId: 'a1', at: 2_000 },
      { type: 'payment.captured', accountId: 'a1', id: 'p1', at: 3_000 },
    ]

    const report = verifyTrace(trace, laws, { complete: true })

    expect(report.results[1]?.status).toBe('pass')
  })

  test('fails duplicate scalar keys', () => {
    const trace: TraceEvent[] = [
      { type: 'payment.captured', accountId: 'a1', id: 'p1', at: 1_000 },
      { type: 'payment.captured', accountId: 'a1', id: 'p1', at: 2_000 },
    ]

    const report = verifyTrace(trace, laws, { complete: true })

    expect(report.results[2]?.status).toBe('fail')
    expect(report.results[2]?.violations[0]?.eventIndexes).toEqual([0, 1])
  })

  test('rejects decreasing timestamps rather than silently sorting', () => {
    const trace: TraceEvent[] = [
      { type: 'payment.requested', accountId: 'a1', id: 'p1', at: 2_000 },
      { type: 'payment.captured', accountId: 'a1', id: 'p1', at: 1_000 },
    ]

    expect(() => verifyTrace(trace, laws)).toThrow(/timestamps decrease/)
  })

  test('law definitions survive a JSON round trip', () => {
    expect(JSON.parse(JSON.stringify(laws))).toEqual(laws)
  })
})
