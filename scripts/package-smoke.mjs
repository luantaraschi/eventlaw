import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const node = process.execPath
const npmCli = process.env.npm_execpath

function run(command, args, cwd, options = {}) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  })
}

function runNpm(args, cwd, options = {}) {
  if (npmCli) return run(node, [npmCli, ...args], cwd, options)
  return run('npm', args, cwd, options)
}

const workspace = await mkdtemp(join(tmpdir(), 'eventlaw-package-smoke-'))
const consumer = join(workspace, 'consumer')
const packageJson = JSON.parse(await readFile(join(repository, 'package.json'), 'utf8'))

try {
  runNpm(['run', 'build'], repository)

  const packedOutput = runNpm(['pack', '--json', '--pack-destination', workspace], repository, {
    capture: true,
  })
  const [packed] = JSON.parse(packedOutput)
  const tarball = join(workspace, packed.filename)

  if (!existsSync(tarball)) {
    throw new Error(`npm pack did not create ${tarball}`)
  }

  await mkdir(consumer)
  await writeFile(
    join(consumer, 'package.json'),
    JSON.stringify({ name: 'eventlaw-package-smoke', private: true, type: 'module' }),
  )

  runNpm(
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      tarball,
      'fast-check@4',
      'typescript@5.6',
    ],
    consumer,
  )

  const esm = `
    import { after, atMostOnce, event, never, TraceMonitor, verifyTrace } from 'eventlaw'
    import { falsify } from 'eventlaw/fast-check'
    import { parseJsonl } from 'eventlaw/jsonl'
    import { eventsFromOtlpJson } from 'eventlaw/opentelemetry'

    const required = [after, atMostOnce, event, never, TraceMonitor, verifyTrace, falsify, parseJsonl, eventsFromOtlpJson]
    if (required.some((value) => typeof value !== 'function')) process.exit(1)
  `
  run(node, ['--input-type=module', '--eval', esm], consumer)

  const cjs = `
    const { after, atMostOnce, event, never, TraceMonitor, verifyTrace } = require('eventlaw')
    const { falsify } = require('eventlaw/fast-check')
    const { parseJsonl } = require('eventlaw/jsonl')
    const { eventsFromOtlpJson } = require('eventlaw/opentelemetry')

    const required = [after, atMostOnce, event, never, TraceMonitor, verifyTrace, falsify, parseJsonl, eventsFromOtlpJson]
    if (required.some((value) => typeof value !== 'function')) process.exit(1)
  `
  run(node, ['--eval', cjs], consumer)

  const typeFixture = `
    import { after, defineLaws, event, verifyTrace, type TraceEvent } from 'eventlaw'
    import { falsify } from 'eventlaw/fast-check'
    import { parseJsonl } from 'eventlaw/jsonl'
    import { eventsFromOtlpJson } from 'eventlaw/opentelemetry'

    const laws = defineLaws({
      completes: after(event('started')).eventually(event('finished')).within(100),
    })
    const trace: TraceEvent[] = parseJsonl('{"type":"started","at":0}')
    verifyTrace(trace, laws, { complete: false })
    void falsify
    void eventsFromOtlpJson
  `
  await writeFile(join(consumer, 'smoke.ts'), typeFixture)
  await writeFile(
    join(consumer, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        noEmit: true,
        strict: true,
        target: 'ES2022',
      },
      files: ['smoke.ts'],
    }),
  )
  runNpm(['exec', '--', 'tsc', '--project', 'tsconfig.json'], consumer)

  const installed = JSON.parse(
    await readFile(join(consumer, 'node_modules', 'eventlaw', 'package.json'), 'utf8'),
  )
  if (installed.version !== packageJson.version) {
    throw new Error(`installed version was ${installed.version}; expected ${packageJson.version}`)
  }

  console.log(`Package smoke passed for eventlaw@${installed.version}.`)
} finally {
  await rm(workspace, { force: true, recursive: true })
}
