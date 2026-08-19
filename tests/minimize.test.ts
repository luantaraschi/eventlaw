import { describe, expect, test } from 'vitest'
import {
  defineLaws,
  event,
  formatMinimizedFailure,
  minimizeFailingTrace,
  never,
  type TraceEvent,
} from '../src/index.js'

const laws = defineLaws({
  noTurnDuringTakeover: never(event('turn.emitted'))
    .between(event('takeover.started'), event('takeover.ended'))
    .partitionBy('conversationId'),
})

describe('minimizeFailingTrace', () => {
  test('removes unrelated events while preserving the named failure', () => {
    const trace: TraceEvent[] = [
      { type: 'message.accepted', conversationId: 'c1', id: 'm1', at: 1_000 },
      { type: 'takeover.started', conversationId: 'c1', at: 2_000 },
      { type: 'heartbeat', conversationId: 'c1', at: 2_500 },
      { type: 'turn.emitted', conversationId: 'c1', messageIds: ['m1'], at: 3_000 },
      { type: 'takeover.ended', conversationId: 'c1', at: 4_000 },
    ]

    const failure = minimizeFailingTrace(trace, laws, 'noTurnDuringTakeover')

    expect(failure.trace).toEqual([
      { type: 'takeover.started', conversationId: 'c1', at: 2_000 },
      { type: 'turn.emitted', conversationId: 'c1', messageIds: ['m1'], at: 3_000 },
    ])
    expect(failure.removed).toBe(3)
    expect(formatMinimizedFailure(failure)).toMatchInlineSnapshot(`
      "noTurnDuringTakeover failed

        turn.emitted occurred between takeover.started and takeover.ended
        partition: \"c1\"

        +    0ms  takeover.started {\"conversationId\":\"c1\"}
        + 1000ms  turn.emitted {\"conversationId\":\"c1\",\"messageIds\":[\"m1\"]}

      Minimal counterexample: 2 event(s); removed 3"
    `)
  })

  test('refuses to minimize a law that does not fail', () => {
    expect(() => minimizeFailingTrace([], laws, 'noTurnDuringTakeover')).toThrow(/does not fail/)
  })
})
