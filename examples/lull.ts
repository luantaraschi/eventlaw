import { initialState, reduce, type Event, type Policy } from '@luantaraschi/lull/core'
import {
  defineLaws,
  event,
  formatMinimizedFailure,
  minimizeFailingTrace,
  never,
  type TraceEvent,
} from '../src/index.js'

const policy: Policy = {
  quietMs: 2_500,
  maxWaitMs: 15_000,
  sessionTtlMs: 30_000,
  takeoverTtlMs: 10_000,
  dedupeWindow: 20,
}

const laws = defineLaws({
  noTurnDuringTakeover: never(event('turn.emitted'))
    .between(event('takeover.started'), event('takeover.ended'))
    .partitionBy('conversationId'),
})

const input: Event[] = [
  { type: 'message', id: 'm1', text: 'hello', at: 1_000 },
  { type: 'takeover', at: 2_000 },
  { type: 'typing', at: 2_500 },
  { type: 'tick', at: 3_500 },
  { type: 'release', at: 4_000 },
]

let state = initialState('c1')
const trace: TraceEvent[] = []

for (const item of input) {
  const paused = state.pausedUntil !== null && item.at < state.pausedUntil
  if (state.pausedUntil !== null && item.at >= state.pausedUntil) {
    trace.push({ type: 'takeover.ended', conversationId: 'c1', at: state.pausedUntil })
  }
  const [next] = reduce(state, item, policy)
  if (item.type === 'takeover') {
    trace.push({ type: 'takeover.started', conversationId: 'c1', at: item.at })
  }
  if (item.type === 'release' && paused) {
    trace.push({ type: 'takeover.ended', conversationId: 'c1', at: item.at })
  }

  // Deliberately planted facade bug: a timer callback emits while takeover is active.
  if (item.type === 'tick' && paused) {
    trace.push({
      type: 'turn.emitted',
      conversationId: 'c1',
      messageIds: ['m1'],
      at: item.at,
    })
  }
  state = next
}

const failure = minimizeFailingTrace(trace, laws, 'noTurnDuringTakeover')
console.log(formatMinimizedFailure(failure))
