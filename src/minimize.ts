import type { Law, MinimizedFailure, TraceEvent, VerificationOptions } from './types.js'
import { verifyTrace } from './verify.js'

export function minimizeFailingTrace(
  trace: readonly TraceEvent[],
  laws: readonly Law[],
  lawName: string,
  options: VerificationOptions = {},
): MinimizedFailure {
  const baseline = verifyTrace(trace, laws, options)
  if (!lawFails(baseline, lawName)) {
    throw new Error(`cannot minimize: law ${JSON.stringify(lawName)} does not fail`)
  }

  let current = [...trace]
  let changed = true

  while (changed) {
    changed = false
    for (let index = 0; index < current.length; index += 1) {
      const candidate = [...current.slice(0, index), ...current.slice(index + 1)]
      const report = verifyTrace(candidate, laws, options)
      if (lawFails(report, lawName)) {
        current = candidate
        changed = true
        break
      }
    }
  }

  return {
    law: lawName,
    trace: current,
    report: verifyTrace(current, laws, options),
    removed: trace.length - current.length,
  }
}

function lawFails(report: ReturnType<typeof verifyTrace>, name: string): boolean {
  return report.results.some((result) => result.name === name && result.status === 'fail')
}
