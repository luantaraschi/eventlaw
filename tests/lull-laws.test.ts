import { initialState, reduce, type Effect, type Event, type Policy } from '@luantaraschi/lull/core'
import { describe, expect, test } from 'vitest'
import {
  after,
  atMostOnce,
  defineLaws,
  event,
  minimizeFailingTrace,
  never,
  ref,
  verifyTrace,
  type TraceEvent,
} from '../src/index.js'

const policy: Policy = {
  quietMs: 2_500,
  maxWaitMs: 15_000,
  sessionTtlMs: 30_000,
  takeoverTtlMs: 10_000,
  dedupeWindow: 20,
}

const lullLaws = defineLaws({
  noTurnDuringTakeover: never(event('turn.emitted'))
    .between(event('takeover.started'), event('takeover.ended'))
    .partitionBy('conversationId'),

  acceptedMessagesProgress: after(event('message.accepted').capture('messageId', 'id'))
    .eventually(event('turn.emitted').contains('messageIds', ref('messageId')))
    .within(15_000)
    .partitionBy('conversationId'),

  oneTurnPerMessage: atMostOnce(event('turn.emitted')).perEach('messageIds'),
})

describe('lull laws', () => {
  test('the real reducer satisfies all three laws in a complete conversation', () => {
    const trace = runLull([
      { type: 'message', id: 'm1', text: 'hi', at: 1_000 },
      { type: 'message', id: 'm2', text: 'one question', at: 1_800 },
      { type: 'tick', at: 4_300 },
      { type: 'takeover', at: 5_000 },
      { type: 'message', id: 'm3', text: 'human is here', at: 6_000 },
      { type: 'release', at: 7_000 },
      { type: 'message', id: 'm4', text: 'bot?', at: 8_000 },
      { type: 'tick', at: 10_500 },
    ])

    const report = verifyTrace(trace, lullLaws, { complete: true })

    expect(report.status).toBe('pass')
    expect(report.results.map((result) => [result.name, result.status])).toEqual([
      ['noTurnDuringTakeover', 'pass'],
      ['acceptedMessagesProgress', 'pass'],
      ['oneTurnPerMessage', 'pass'],
    ])
  })

  test('a planted runtime bug is found and reduced to two events', () => {
    const trace = runLull(
      [
        { type: 'message', id: 'm1', text: 'hi', at: 1_000 },
        { type: 'takeover', at: 2_000 },
        { type: 'typing', at: 2_500 },
        { type: 'tick', at: 3_500 },
        { type: 'release', at: 4_000 },
      ],
      { injectTurnWhilePaused: true },
    )

    const failure = minimizeFailingTrace(trace, lullLaws, 'noTurnDuringTakeover', {
      complete: true,
    })

    expect(failure.trace).toHaveLength(2)
    expect(failure.trace.map((item) => item.type)).toEqual(['takeover.started', 'turn.emitted'])
  })

  test('the adapter closes takeover when its TTL expires lazily', () => {
    const trace = runLull([
      { type: 'takeover', at: 1_000 },
      { type: 'message', id: 'm1', text: 'back?', at: 12_000 },
      { type: 'tick', at: 14_500 },
    ])

    expect(trace.map((item) => [item.type, item.at])).toEqual([
      ['takeover.started', 1_000],
      ['takeover.ended', 11_000],
      ['message.accepted', 12_000],
      ['turn.emitted', 14_500],
    ])
    expect(verifyTrace(trace, lullLaws, { complete: true }).status).toBe('pass')
  })
})

function runLull(input: Event[], faults: { injectTurnWhilePaused?: boolean } = {}): TraceEvent[] {
  let state = initialState('c1')
  const trace: TraceEvent[] = []

  for (const item of input) {
    const wasPaused = state.pausedUntil !== null && item.at < state.pausedUntil
    if (state.pausedUntil !== null && item.at >= state.pausedUntil) {
      trace.push({ type: 'takeover.ended', conversationId: 'c1', at: state.pausedUntil })
    }
    const [next, effects] = reduce(state, item, policy)

    if (item.type === 'takeover') {
      trace.push({ type: 'takeover.started', conversationId: 'c1', at: item.at })
    }
    if (item.type === 'release' && wasPaused) {
      trace.push({ type: 'takeover.ended', conversationId: 'c1', at: item.at })
    }
    if (
      item.type === 'message' &&
      !effects.some((effect) => effect.type === 'drop' && effect.messageId === item.id)
    ) {
      trace.push({ type: 'message.accepted', conversationId: 'c1', id: item.id, at: item.at })
    }

    appendEffects(trace, effects, item.at)

    if (faults.injectTurnWhilePaused && item.type === 'tick' && wasPaused) {
      trace.push({
        type: 'turn.emitted',
        conversationId: 'c1',
        messageIds: ['fault'],
        at: item.at,
      })
    }

    state = next
  }

  return trace
}

function appendEffects(trace: TraceEvent[], effects: Effect[], at: number): void {
  for (const effect of effects) {
    if (effect.type === 'emitTurn') {
      trace.push({
        type: 'turn.emitted',
        conversationId: effect.conversationId,
        messageIds: effect.messages.map((message) => message.id),
        at,
      })
    }
  }
}
