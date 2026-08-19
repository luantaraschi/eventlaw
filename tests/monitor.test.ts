import { expect, test } from 'vitest'
import {
  after,
  atMostOnce,
  createMonitor,
  defineLaws,
  event,
  monitoringProfile,
  monitorTrace,
  never,
  ref,
  verifyTrace,
  type TraceEvent,
} from '../src/index.js'

const laws = defineLaws({
  messageProgresses: after(event('message.accepted').capture('id', 'id'))
    .eventually(event('turn.emitted').contains('messageIds', ref('id')))
    .within(5_000),
})

test('the same law moves from pending to pass over an async stream', async () => {
  async function* events(): AsyncGenerator<TraceEvent> {
    yield { type: 'message.accepted', id: 'm1', at: 1_000 }
    yield { type: 'turn.emitted', messageIds: ['m1'], at: 2_000 }
  }

  const statuses: string[] = []
  for await (const update of monitorTrace(events(), laws)) {
    statuses.push(`${update.kind}:${update.report.status}`)
  }

  expect(statuses).toEqual(['event:pending', 'event:pass', 'complete:pass'])
})

test('stream completion closes an unresolved obligation', async () => {
  async function* events(): AsyncGenerator<TraceEvent> {
    yield { type: 'message.accepted', id: 'm1', at: 1_000 }
  }

  const statuses: string[] = []
  for await (const update of monitorTrace(events(), laws)) {
    statuses.push(`${update.kind}:${update.report.status}`)
  }

  expect(statuses).toEqual(['event:pending', 'complete:fail'])
})

test('completion report matches finite verification', () => {
  const trace: TraceEvent[] = [{ type: 'message.accepted', id: 'm1', at: 1_000 }]
  const monitor = createMonitor(laws)
  monitor.push(trace[0]!)

  expect(monitor.complete()).toEqual(verifyTrace(trace, laws, { complete: true, now: 1_000 }))
})

test('explicit clock advancement fails an obligation during silence', () => {
  const monitor = createMonitor(laws)

  expect(monitor.push({ type: 'message.accepted', id: 'm1', at: 1_000 }).status).toBe('pending')
  expect(monitor.advanceTo(5_999).status).toBe('pending')
  expect(monitor.advanceTo(6_000).status).toBe('fail')
})

test('a temporal failure stays terminal after later events', () => {
  const monitor = createMonitor(laws)
  monitor.push({ type: 'message.accepted', id: 'm1', at: 1_000 })
  monitor.advanceTo(6_000)

  const report = monitor.push({ type: 'turn.emitted', messageIds: ['m1'], at: 6_000 })

  expect(report.status).toBe('fail')
  expect(report.results[0]?.violations[0]?.at).toBe(6_000)
})

test('rejects events behind the explicit monitor clock', () => {
  const monitor = createMonitor(laws)
  monitor.advanceTo(5_000)

  expect(() => monitor.push({ type: 'message.accepted', id: 'm1', at: 4_999 })).toThrow(
    /behind monitor time/,
  )
})

test('rejects negative clock advancement before the first event', () => {
  const monitor = createMonitor(laws)

  expect(() => monitor.advanceTo(-1)).toThrow(/move monitor time backward/)
})

test('accepts a correlated consequence exactly at its deadline', () => {
  const monitor = createMonitor(laws)
  monitor.push({ type: 'message.accepted', id: 'm1', at: 1_000 })

  const report = monitor.push({ type: 'turn.emitted', messageIds: ['m1'], at: 6_000 })

  expect(report.status).toBe('pass')
  expect(report.results[0]?.violations).toEqual([])
})

test('reports the first late consequent with both event indexes', () => {
  const monitor = createMonitor(laws)
  monitor.push({ type: 'message.accepted', id: 'm1', at: 1_000 })

  const report = monitor.push({ type: 'turn.emitted', messageIds: ['m1'], at: 6_001 })

  expect(report.results[0]?.violations[0]).toMatchObject({
    at: 6_001,
    eventIndexes: [0, 1],
  })
  expect(report.results[0]?.violations[0]?.message).toContain('1ms after its deadline')
})

test('matches the offline verifier for every successful prefix', () => {
  const mixedLaws = defineLaws({
    paymentProgresses: after(event('payment.requested').capture('id', 'id'))
      .eventually(event('payment.captured').equals('id', ref('id')))
      .within(5_000)
      .partitionBy('accountId'),
    noCaptureWhileFrozen: never(event('payment.captured'))
      .between(event('account.frozen'), event('account.unfrozen'))
      .partitionBy('accountId'),
    oneCapturePerPayment: atMostOnce(event('payment.captured')).per('id'),
  })
  const trace: TraceEvent[] = [
    { type: 'payment.requested', accountId: 'a1', id: 'p1', at: 1_000 },
    { type: 'account.frozen', accountId: 'a2', at: 1_100 },
    { type: 'payment.captured', accountId: 'a1', id: 'p1', at: 2_000 },
    { type: 'account.unfrozen', accountId: 'a2', at: 2_100 },
  ]
  const monitor = createMonitor(mixedLaws)
  const prefix: TraceEvent[] = []

  for (const item of trace) {
    prefix.push(item)
    expect(monitor.push(item)).toEqual(
      verifyTrace(prefix, mixedLaws, { now: item.at, complete: false }),
    )
  }
})

test('classifies and exposes retained state per operator', () => {
  const memoryLaws = defineLaws({
    progresses: after(event('accepted').capture('id', 'id'))
      .eventually(event('done').equals('id', ref('id')))
      .within(1_000),
    protectedScope: never(event('forbidden'))
      .between(event('opened'), event('closed'))
      .partitionBy('scope'),
    uniqueItems: atMostOnce(event('item')).per('id'),
  })

  expect(monitoringProfile(memoryLaws).map(({ name, memory }) => [name, memory])).toEqual([
    ['progresses', 'window-bounded'],
    ['protectedScope', 'scope-bounded'],
    ['uniqueItems', 'unbounded'],
  ])

  const monitor = createMonitor(memoryLaws)
  monitor.push({ type: 'accepted', id: 'a', at: 1 })
  monitor.push({ type: 'opened', scope: 's1', at: 2 })
  expect(monitor.stats().laws.map((law) => law.retainedEntries)).toEqual([1, 1, 0])

  monitor.push({ type: 'done', id: 'a', at: 3 })
  monitor.push({ type: 'closed', scope: 's1', at: 4 })
  monitor.push({ type: 'item', id: 'i1', at: 5 })
  monitor.push({ type: 'item', id: 'i2', at: 6 })

  expect(monitor.stats()).toMatchObject({
    eventsProcessed: 6,
    retainedEntries: 2,
    laws: [
      { name: 'progresses', retainedEntries: 0, terminal: false },
      { name: 'protectedScope', retainedEntries: 0, terminal: false },
      { name: 'uniqueItems', retainedEntries: 2, terminal: false },
    ],
  })
})

test('does not retain unrelated event history', () => {
  const monitor = createMonitor(laws)

  for (let index = 0; index < 1_000; index += 1) {
    monitor.push({ type: 'noise', at: index })
  }

  expect(monitor.stats()).toMatchObject({
    eventsProcessed: 1_000,
    retainedEntries: 0,
  })
})

test('releases retained operator state after a terminal failure', () => {
  const monitor = createMonitor(laws)
  monitor.push({ type: 'message.accepted', id: 'm1', at: 1_000 })

  expect(monitor.advanceTo(6_000).status).toBe('fail')
  expect(monitor.stats().laws[0]).toMatchObject({
    retainedEntries: 0,
    terminal: true,
  })
})
