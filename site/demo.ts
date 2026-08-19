import {
  after,
  defineLaws,
  event,
  formatMinimizedFailure,
  minimizeFailingTrace,
  never,
  ref,
  verifyTrace,
  type Law,
  type LawStatus,
  type TraceEvent,
} from '../src/index.js'

type ScenarioId = 'violation' | 'passing' | 'pending'

type Scenario = {
  id: ScenarioId
  label: string
  filename: string
  lawName: string
  source: string
  note: string
  trace: TraceEvent[]
  complete: boolean
  now?: number
  relevantIndexes?: number[]
}

const laws = defineLaws({
  noTurnDuringTakeover: never(event('turn.emitted'))
    .between(event('takeover.started'), event('takeover.ended'))
    .partitionBy('conversationId'),

  paymentCompletes: after(event('payment.requested').capture('paymentId', 'id'))
    .eventually(event('payment.captured').equals('id', ref('paymentId')))
    .within(5_000)
    .partitionBy('accountId'),
})

const takeoverSource = `const laws = defineLaws({
  noTurnDuringTakeover: never(event('turn.emitted'))
    .between(event('takeover.started'), event('takeover.ended'))
    .partitionBy('conversationId'),
})`

const paymentSource = `const laws = defineLaws({
  paymentCompletes: after(event('payment.requested')
    .capture('paymentId', 'id'))
    .eventually(event('payment.captured')
      .equals('id', ref('paymentId')))
    .within(5_000)
    .partitionBy('accountId'),
})`

const scenarios: Record<ScenarioId, Scenario> = {
  violation: {
    id: 'violation',
    label: 'Violation',
    filename: 'no-turn-during-takeover.ts',
    lawName: 'noTurnDuringTakeover',
    source: takeoverSource,
    note: 'A five-event trace contains one forbidden turn. Eventlaw reduces it to the two events that explain the violation.',
    trace: [
      { type: 'message.accepted', at: 1_000, conversationId: 'c-17' },
      { type: 'takeover.started', at: 2_000, conversationId: 'c-17' },
      { type: 'heartbeat', at: 2_500, conversationId: 'c-17' },
      { type: 'turn.emitted', at: 3_000, conversationId: 'c-17' },
      { type: 'takeover.ended', at: 4_000, conversationId: 'c-17' },
    ],
    complete: true,
    relevantIndexes: [1, 3],
  },
  passing: {
    id: 'passing',
    label: 'Passing',
    filename: 'no-turn-during-takeover.ts',
    lawName: 'noTurnDuringTakeover',
    source: takeoverSource,
    note: 'The turn is emitted only after the takeover ends, so the complete recorded trace satisfies the law.',
    trace: [
      { type: 'takeover.started', at: 1_000, conversationId: 'c-17' },
      { type: 'heartbeat', at: 2_000, conversationId: 'c-17' },
      { type: 'takeover.ended', at: 3_000, conversationId: 'c-17' },
      { type: 'turn.emitted', at: 3_500, conversationId: 'c-17' },
    ],
    complete: true,
  },
  pending: {
    id: 'pending',
    label: 'Pending',
    filename: 'payment-completes.ts',
    lawName: 'paymentCompletes',
    source: paymentSource,
    note: 'The payment was requested two seconds ago. The live trace stays pending while three seconds remain before the deadline.',
    trace: [{ type: 'payment.requested', at: 1_000, accountId: 'a-17', id: 'p-42' }],
    complete: false,
    now: 3_000,
  },
}

const themeToggle = requireElement<HTMLButtonElement>('theme-toggle')
const scenarioButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-scenario]')]
const lawCode = requireElement<HTMLElement>('law-code')
const lawFilename = requireElement<HTMLElement>('law-filename')
const eventCount = requireElement<HTMLElement>('event-count')
const eventList = requireElement<HTMLOListElement>('event-list')
const runButton = requireElement<HTMLButtonElement>('run-law')
const copyButton = requireElement<HTMLButtonElement>('copy-law')
const reportStatus = requireElement<HTMLElement>('report-status')
const reportEmpty = requireElement<HTMLElement>('report-empty')
const reportOutput = requireElement<HTMLPreElement>('report-output')
const scenarioNote = requireElement<HTMLElement>('scenario-note')

let activeScenario = scenarios.violation

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (element === null) throw new Error(`missing element #${id}`)
  return element as T
}

function findLaw(name: string): Law {
  const law = laws.find((candidate) => candidate.name === name)
  if (law === undefined) throw new Error(`missing demo law ${name}`)
  return law
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function highlightSource(source: string): string {
  const escaped = escapeHtml(source)
  return escaped
    .replace(/\b(const)\b/g, '<span class="token-keyword">$1</span>')
    .replace(
      /\b(defineLaws|never|event|between|partitionBy|after|capture|eventually|equals|ref|within)\b/g,
      '<span class="token-function">$1</span>',
    )
    .replace(/(&#039;[^&]*?&#039;)/g, '<span class="token-string">$1</span>')
}

function selectScenario(id: ScenarioId): void {
  activeScenario = scenarios[id]

  for (const button of scenarioButtons) {
    const selected = button.dataset.scenario === id
    button.setAttribute('aria-selected', String(selected))
    button.tabIndex = selected ? 0 : -1
  }

  lawFilename.textContent = activeScenario.filename
  lawCode.innerHTML = highlightSource(activeScenario.source)
  eventCount.textContent = `${activeScenario.trace.length} ${activeScenario.trace.length === 1 ? 'event' : 'events'}`
  scenarioNote.textContent = activeScenario.note
  renderEvents(activeScenario)
  resetReport()
}

function renderEvents(scenario: Scenario): void {
  const firstAt = scenario.trace[0]?.at ?? 0
  eventList.replaceChildren(
    ...scenario.trace.map((traceEvent, index) => {
      const item = document.createElement('li')
      item.dataset.relevant = String(scenario.relevantIndexes?.includes(index) ?? false)

      const time = document.createElement('span')
      time.className = 'event-time'
      time.textContent = `+${traceEvent.at - firstAt}ms`

      const type = document.createElement('span')
      type.className = 'event-type'
      type.textContent = traceEvent.type

      const meta = document.createElement('span')
      meta.className = 'event-meta'
      const partition = traceEvent.conversationId ?? traceEvent.accountId
      meta.textContent = typeof partition === 'string' ? partition : `#${index + 1}`

      item.append(time, type, meta)
      return item
    }),
  )
}

function resetReport(): void {
  runButton.setAttribute('aria-busy', 'false')
  runButton.querySelector('span')!.textContent = 'Run law'
  reportEmpty.hidden = false
  reportOutput.hidden = true
  reportOutput.textContent = ''
  reportOutput.dataset.status = 'idle'
  reportStatus.dataset.status = 'idle'
  reportStatus.textContent = 'Ready'
}

function statusLabel(status: LawStatus): string {
  if (status === 'fail') return '× Fail'
  if (status === 'pass') return '✓ Pass'
  return '◷ Pending'
}

function runScenario(): void {
  if (runButton.getAttribute('aria-busy') === 'true') return
  runButton.setAttribute('aria-busy', 'true')
  runButton.querySelector('span')!.textContent = 'Evaluating…'

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.setTimeout(
    () => {
      const law = findLaw(activeScenario.lawName)
      const options = {
        complete: activeScenario.complete,
        ...(activeScenario.now === undefined ? {} : { now: activeScenario.now }),
      }
      const report = verifyTrace(activeScenario.trace, [law], options)

      let output: string
      if (report.status === 'fail') {
        output = formatMinimizedFailure(
          minimizeFailingTrace(activeScenario.trace, [law], activeScenario.lawName, options),
        )
      } else if (report.status === 'pending') {
        const remaining = Math.max(0, 6_000 - report.now)
        output = `${activeScenario.lawName} pending\n\n  payment.captured has not arrived yet\n  ${remaining}ms remain before the deadline\n\nTrace stays open; no false failure is reported.`
      } else {
        output = `${activeScenario.lawName} passed\n\n  ${activeScenario.trace.length} events checked\n  no forbidden event occurred inside the takeover scope\n\nThe same law can now monitor the live stream.`
      }

      reportEmpty.hidden = true
      reportOutput.hidden = false
      reportOutput.textContent = output
      reportOutput.dataset.status = report.status
      reportStatus.dataset.status = report.status
      reportStatus.textContent = statusLabel(report.status)
      runButton.setAttribute('aria-busy', 'false')
      runButton.querySelector('span')!.textContent = 'Run again'
    },
    reducedMotion ? 0 : 180,
  )
}

function applyTheme(theme: 'dark' | 'light'): void {
  document.documentElement.dataset.theme = theme
  localStorage.setItem('eventlaw-theme', theme)
  themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Use light theme' : 'Use dark theme')
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  themeColor?.setAttribute('content', theme === 'dark' ? '#071412' : '#f4f8f6')
}

themeToggle.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')
})

for (const button of scenarioButtons) {
  button.addEventListener('click', () => {
    const id = button.dataset.scenario as ScenarioId | undefined
    if (id !== undefined && id in scenarios) selectScenario(id)
  })

  button.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const current = scenarioButtons.indexOf(button)
    const direction = event.key === 'ArrowRight' ? 1 : -1
    const next =
      scenarioButtons[(current + direction + scenarioButtons.length) % scenarioButtons.length]
    next?.click()
    next?.focus()
  })
}

runButton.addEventListener('click', runScenario)

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') runScenario()
})

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(activeScenario.source)
    copyButton.textContent = 'Copied'
  } catch {
    copyButton.textContent = 'Select code to copy'
  }
  window.setTimeout(() => {
    copyButton.textContent = 'Copy law'
  }, 1_500)
})

applyTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
selectScenario('violation')
