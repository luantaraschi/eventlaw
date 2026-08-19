import { describe, expect, test } from 'vitest'
import { JsonlTraceError, decodeJsonl, parseJsonl, readJsonl } from '../src/jsonl.js'

describe('JSONL trace adapter', () => {
  test('parses one trace event per line', () => {
    expect(
      parseJsonl(
        '{"type":"order.placed","at":1000,"orderId":"o-1"}\r\n' +
          '{"type":"order.paid","at":1200,"orderId":"o-1"}\n',
      ),
    ).toEqual([
      { type: 'order.placed', at: 1_000, orderId: 'o-1' },
      { type: 'order.paid', at: 1_200, orderId: 'o-1' },
    ])
  })

  test('returns an empty trace for an empty input', () => {
    expect(parseJsonl('')).toEqual([])
  })

  test('reports the source and line for malformed JSON', () => {
    expect(() => parseJsonl('{"type":"ok","at":1}\n{"type":', { source: 'events.jsonl' })).toThrow(
      'events.jsonl:2: invalid JSON',
    )
  })

  test.each([
    ['blank line', '{"type":"ok","at":1}\n\n', 2, 'blank lines'],
    ['non-object', '[]', 1, 'expected a JSON object'],
    ['missing type', '{"at":1}', 1, 'event type'],
    ['invalid timestamp', '{"type":"ok","at":"now"}', 1, 'event at'],
    ['byte order mark', '\ufeff{"type":"ok","at":1}', 1, 'byte order mark'],
  ])('rejects %s', (_name, input, line, message) => {
    try {
      parseJsonl(input, { source: 'trace.jsonl' })
      throw new Error('expected parsing to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(JsonlTraceError)
      expect(error).toMatchObject({ line, source: 'trace.jsonl' })
      expect((error as Error).message).toContain(message)
    }
  })

  test('decodes byte chunks without splitting multibyte characters', async () => {
    const bytes = new TextEncoder().encode('{"type":"pedido.criado","at":1,"descrição":"café"}\n')
    const accent = bytes.indexOf(0xc3)
    const chunks = [bytes.slice(0, accent + 1), bytes.slice(accent + 1)]

    await expect(readJsonl(chunks)).resolves.toEqual([
      { type: 'pedido.criado', at: 1, descrição: 'café' },
    ])
  })

  test('streams complete events before the input ends', async () => {
    async function* chunks(): AsyncGenerator<string> {
      yield '{"type":"first","at":1}\n{"type"'
      yield ':"second","at":2}'
    }

    const events = []
    for await (const event of decodeJsonl(chunks())) events.push(event)

    expect(events).toEqual([
      { type: 'first', at: 1 },
      { type: 'second', at: 2 },
    ])
  })

  test('rejects mixed text and byte chunks', async () => {
    const mixed = ['{"type":"first","at":1}\n', new Uint8Array()]

    await expect(readJsonl(mixed)).rejects.toThrow(/cannot mix/)
  })
})
