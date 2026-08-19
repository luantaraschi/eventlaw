import fc, { type Arbitrary } from 'fast-check'
import { formatMinimizedFailure } from './format.js'
import { minimizeFailingTrace } from './minimize.js'
import type { Law, MinimizedFailure, TraceEvent, VerificationOptions } from './types.js'
import { verifyTrace } from './verify.js'

export type FalsifyOptions<TestCase> = {
  arbitrary: Arbitrary<TestCase>
  run: (testCase: TestCase) => readonly TraceEvent[] | Promise<readonly TraceEvent[]>
  laws: readonly Law[]
  law: string
  numRuns?: number
  seed?: number
  verification?: VerificationOptions
}

export type Falsification<TestCase> = {
  law: string
  testCase: TestCase
  failure: MinimizedFailure
  seed: number
  path: string
  numRuns: number
  numShrinks: number
}

class RuntimeExecutionError extends Error {
  readonly cause: unknown

  constructor(cause: unknown) {
    super('system under test threw while eventlaw was generating a trace')
    this.name = 'RuntimeExecutionError'
    this.cause = cause
  }
}

export async function falsify<TestCase>(
  options: FalsifyOptions<TestCase>,
): Promise<Falsification<TestCase> | null> {
  if (!options.laws.some((law) => law.name === options.law)) {
    throw new Error(`unknown law ${JSON.stringify(options.law)}`)
  }

  const property = fc.asyncProperty(options.arbitrary, async (testCase) => {
    try {
      const trace = await options.run(testCase)
      const report = verifyTrace(trace, options.laws, options.verification)
      return !report.results.some(
        (result) => result.name === options.law && result.status === 'fail',
      )
    } catch (error) {
      throw new RuntimeExecutionError(error)
    }
  })

  const parameters = {
    ...(options.numRuns === undefined ? {} : { numRuns: options.numRuns }),
    ...(options.seed === undefined ? {} : { seed: options.seed }),
  }
  const details = await fc.check(property, parameters)

  if (!details.failed) return null
  if (details.errorInstance instanceof RuntimeExecutionError) {
    throw details.errorInstance.cause
  }

  const testCase = details.counterexample?.[0]
  if (testCase === undefined) {
    throw new Error('fast-check reported a failure without a counterexample')
  }

  const trace = await options.run(testCase)
  return {
    law: options.law,
    testCase,
    failure: minimizeFailingTrace(trace, options.laws, options.law, options.verification),
    seed: details.seed,
    path: details.counterexamplePath ?? '',
    numRuns: details.numRuns,
    numShrinks: details.numShrinks,
  }
}

export function formatFalsification<TestCase>(falsification: Falsification<TestCase>): string {
  return [
    formatMinimizedFailure(falsification.failure),
    '',
    `Seed: ${falsification.seed}`,
    `Path: ${falsification.path}`,
    `Runs: ${falsification.numRuns}; shrinks: ${falsification.numShrinks}`,
    `Minimal generated case: ${JSON.stringify(falsification.testCase)}`,
  ].join('\n')
}
