import { expect, test } from 'vitest'
import { atMostOnce, defineLaws, event, verifyTrace, type TraceEvent } from '../src/index.js'

const laws = defineLaws({
  oneTurnPerMessage: atMostOnce(event('turn.emitted')).perEach('messageIds'),
})

test('perEach treats each array element as an independent key', () => {
  const trace: TraceEvent[] = [
    { type: 'turn.emitted', messageIds: ['m1', 'm2'], at: 1_000 },
    { type: 'turn.emitted', messageIds: ['m2', 'm3'], at: 2_000 },
  ]

  const report = verifyTrace(trace, laws)

  expect(report.status).toBe('fail')
  expect(report.results[0]?.violations[0]?.message).toContain('"m2"')
})

test('perEach reports a malformed non-array key', () => {
  const trace: TraceEvent[] = [{ type: 'turn.emitted', messageIds: 'm1', at: 1_000 }]

  const report = verifyTrace(trace, laws)

  expect(report.status).toBe('fail')
  expect(report.results[0]?.violations[0]?.message).toContain('must be an array')
})
