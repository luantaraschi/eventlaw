import type { TraceEvent } from './types.js'

export type JsonlChunk = string | Uint8Array
export type JsonlInput = Iterable<JsonlChunk> | AsyncIterable<JsonlChunk>

export type JsonlOptions = {
  source?: string
}

export class JsonlTraceError extends Error {
  readonly line: number
  readonly source: string

  constructor(source: string, line: number, detail: string) {
    super(`${source}:${line}: ${detail}`)
    this.name = 'JsonlTraceError'
    this.line = line
    this.source = source
  }
}

export function parseJsonl(input: string, options: JsonlOptions = {}): TraceEvent[] {
  if (input.length === 0) return []

  const source = options.source ?? '<input>'
  rejectByteOrderMark(input, source)

  const lines = input.split('\n')
  if (lines.at(-1) === '') lines.pop()

  return lines.map((line, index) => parseEventLine(line, index + 1, source))
}

export async function* decodeJsonl(
  input: JsonlInput,
  options: JsonlOptions = {},
): AsyncGenerator<TraceEvent> {
  const source = options.source ?? '<stream>'
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
  let mode: 'bytes' | 'text' | undefined
  let buffer = ''
  let lineNumber = 1
  let atBeginning = true

  const append = (text: string): void => {
    if (atBeginning && text.length > 0) {
      atBeginning = false
      rejectByteOrderMark(text, source)
    }
    buffer += text
  }

  for await (const chunk of input) {
    const chunkMode = typeof chunk === 'string' ? 'text' : 'bytes'
    if (mode !== undefined && mode !== chunkMode) {
      throw new TypeError('JSONL input cannot mix string and byte chunks')
    }
    mode = chunkMode

    if (chunkMode === 'text') {
      append(chunk as string)
    } else {
      try {
        append(decoder.decode(chunk as Uint8Array, { stream: true }))
      } catch {
        throw new JsonlTraceError(source, lineNumber, 'input is not valid UTF-8')
      }
    }

    let newline = buffer.indexOf('\n')
    while (newline >= 0) {
      yield parseEventLine(buffer.slice(0, newline), lineNumber, source)
      buffer = buffer.slice(newline + 1)
      lineNumber += 1
      newline = buffer.indexOf('\n')
    }
  }

  if (mode === 'bytes') {
    try {
      append(decoder.decode())
    } catch {
      throw new JsonlTraceError(source, lineNumber, 'input is not valid UTF-8')
    }
  }

  if (buffer.length > 0) {
    yield parseEventLine(buffer, lineNumber, source)
  }
}

export async function readJsonl(
  input: JsonlInput,
  options: JsonlOptions = {},
): Promise<TraceEvent[]> {
  const trace: TraceEvent[] = []
  for await (const event of decodeJsonl(input, options)) trace.push(event)
  return trace
}

function parseEventLine(line: string, lineNumber: number, source: string): TraceEvent {
  if (line.trim().length === 0) {
    throw new JsonlTraceError(source, lineNumber, 'blank lines are not valid JSON Lines values')
  }

  let value: unknown
  try {
    value = JSON.parse(line)
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'invalid JSON'
    throw new JsonlTraceError(source, lineNumber, `invalid JSON: ${detail}`)
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new JsonlTraceError(source, lineNumber, 'expected a JSON object')
  }

  const record = value as Record<string, unknown>
  if (typeof record.type !== 'string' || record.type.length === 0) {
    throw new JsonlTraceError(source, lineNumber, 'event type must be a non-empty string')
  }
  if (typeof record.at !== 'number' || !Number.isFinite(record.at)) {
    throw new JsonlTraceError(source, lineNumber, 'event at must be a finite number')
  }

  return record as TraceEvent
}

function rejectByteOrderMark(input: string, source: string): void {
  if (input.charCodeAt(0) === 0xfeff) {
    throw new JsonlTraceError(source, 1, 'UTF-8 byte order marks are not allowed')
  }
}
