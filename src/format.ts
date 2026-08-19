import type { MinimizedFailure, TraceEvent, VerificationReport } from './types.js'

export function formatReport(report: VerificationReport, trace: readonly TraceEvent[]): string {
  const failed = report.results.find((result) => result.status === 'fail')
  if (failed === undefined) {
    return `eventlaw ${report.status}: ${report.results.length} law(s), ${trace.length} event(s)`
  }

  const violation = failed.violations[0]
  if (violation === undefined) return `${failed.name} failed`

  const relevant = new Set(violation.eventIndexes)
  const firstAt = trace[violation.eventIndexes[0] ?? 0]?.at ?? 0
  const lines = [`${failed.name} failed`, '', `  ${violation.message}`]

  if ('partition' in violation) lines.push(`  partition: ${JSON.stringify(violation.partition)}`)
  lines.push('')

  for (const [index, event] of trace.entries()) {
    if (!relevant.has(index)) continue
    const offset = event.at - firstAt
    lines.push(`  +${String(offset).padStart(5, ' ')}ms  ${formatEvent(event)}`)
  }

  if (!trace.some((event) => event.at === violation.at) && violation.at >= firstAt) {
    lines.push(`  +${String(violation.at - firstAt).padStart(5, ' ')}ms  deadline`)
  }

  return lines.join('\n')
}

export function formatMinimizedFailure(failure: MinimizedFailure): string {
  return `${formatReport(failure.report, failure.trace)}\n\nMinimal counterexample: ${failure.trace.length} event(s); removed ${failure.removed}`
}

function formatEvent(event: TraceEvent): string {
  const details = Object.fromEntries(
    Object.entries(event).filter(([key]) => key !== 'type' && key !== 'at'),
  )
  const suffix = Object.keys(details).length === 0 ? '' : ` ${JSON.stringify(details)}`
  return `${event.type}${suffix}`
}
