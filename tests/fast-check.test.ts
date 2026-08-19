import fc from 'fast-check'
import { describe, expect, test } from 'vitest'
import { defineLaws, event, never, type TraceEvent } from '../src/index.js'
import { falsify, formatFalsification } from '../src/fast-check.js'

type Step = 'message' | 'takeover' | 'release' | 'tick' | 'typing'

const laws = defineLaws({
  noTurnDuringTakeover: never(event('turn.emitted'))
    .between(event('takeover.started'), event('takeover.ended'))
    .partitionBy('conversationId'),
})

describe('fast-check adapter', () => {
  test('generates and shrinks the input before minimizing the emitted trace', async () => {
    const result = await falsify({
      arbitrary: fc.array(
        fc.constantFrom<Step>('message', 'takeover', 'release', 'tick', 'typing'),
        { minLength: 1, maxLength: 12 },
      ),
      run: runFaultyRuntime,
      laws,
      law: 'noTurnDuringTakeover',
      numRuns: 500,
      seed: 42,
    })

    expect(result).not.toBeNull()
    expect(result?.testCase).toEqual(['takeover', 'tick'])
    expect(result?.failure.trace.map((item) => item.type)).toEqual([
      'takeover.started',
      'turn.emitted',
    ])
    expect(formatFalsification(result!)).toContain('Minimal generated case: ["takeover","tick"]')
  })

  test('returns null when generated cases satisfy the law', async () => {
    const result = await falsify({
      arbitrary: fc.array(fc.constantFrom<Step>('message', 'takeover', 'release', 'typing'), {
        maxLength: 8,
      }),
      run: runFaultyRuntime,
      laws,
      law: 'noTurnDuringTakeover',
      numRuns: 50,
      seed: 42,
    })

    expect(result).toBeNull()
  })
})

function runFaultyRuntime(steps: Step[]): TraceEvent[] {
  const trace: TraceEvent[] = []
  let takeover = false

  for (const [index, step] of steps.entries()) {
    const at = (index + 1) * 1_000
    if (step === 'takeover') {
      takeover = true
      trace.push({ type: 'takeover.started', conversationId: 'c1', at })
    }
    if (step === 'release' && takeover) {
      takeover = false
      trace.push({ type: 'takeover.ended', conversationId: 'c1', at })
    }
    if (step === 'tick' && takeover) {
      // Planted bug: a stale timer emits even though takeover owns the floor.
      trace.push({ type: 'turn.emitted', conversationId: 'c1', messageIds: ['m1'], at })
    }
  }

  return trace
}
