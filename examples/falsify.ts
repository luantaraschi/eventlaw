import fc from 'fast-check'
import { defineLaws, event, never, type TraceEvent } from '../src/index.js'
import { falsify, formatFalsification } from '../src/fast-check.js'

type Command = 'message' | 'takeover' | 'release' | 'tick' | 'typing'

const laws = defineLaws({
  noTurnDuringTakeover: never(event('turn.emitted'))
    .between(event('takeover.started'), event('takeover.ended'))
    .partitionBy('conversationId'),
})

const result = await falsify({
  arbitrary: fc.array(
    fc.constantFrom<Command>('message', 'takeover', 'release', 'tick', 'typing'),
    { minLength: 1, maxLength: 12 },
  ),
  run: runFaultyRuntime,
  laws,
  law: 'noTurnDuringTakeover',
  numRuns: 500,
  seed: 42,
})

if (result === null) {
  console.log('No counterexample found.')
  process.exitCode = 1
} else {
  console.log(formatFalsification(result))
}

function runFaultyRuntime(commands: Command[]): TraceEvent[] {
  const trace: TraceEvent[] = []
  let takeover = false

  for (const [index, command] of commands.entries()) {
    const at = (index + 1) * 1_000
    if (command === 'takeover') {
      takeover = true
      trace.push({ type: 'takeover.started', conversationId: 'c1', at })
    }
    if (command === 'release' && takeover) {
      takeover = false
      trace.push({ type: 'takeover.ended', conversationId: 'c1', at })
    }
    if (command === 'tick' && takeover) {
      // Deliberately wrong: a stale timer emits while a human owns the floor.
      trace.push({ type: 'turn.emitted', conversationId: 'c1', messageIds: ['m1'], at })
    }
  }

  return trace
}
