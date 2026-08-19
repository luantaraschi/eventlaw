import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { after, atMostOnce, defineLaws, event, ref, verifyTrace } from '../src/index.js'
import { eventsFromOtlpJson, OtlpEventError } from '../src/opentelemetry.js'

const officialFixture = JSON.parse(
  readFileSync(new URL('./fixtures/opentelemetry-events.json', import.meta.url), 'utf8'),
)
const sdkFixture = JSON.parse(
  readFileSync(new URL('./fixtures/opentelemetry-sdk-events.json', import.meta.url), 'utf8'),
)

describe('OpenTelemetry event adapter', () => {
  test('converts the official OTLP JSON event fixture', () => {
    const result = eventsFromOtlpJson(officialFixture)

    expect(result.skippedLogRecords).toBe(0)
    expect(result.trace).toEqual([
      {
        type: 'browser.page_view',
        at: 1_544_712_660_300,
        body: {
          type: 0,
          url: 'https://www.guidgenerator.com/online-guid-generator.aspx',
          referrer: 'https://wwww.google.com',
          title: 'Free Online GUID Generator',
        },
        otel: {
          timestampSource: 'timeUnixNano',
          timeUnixNano: '1544712660300000000',
          observedTimeUnixNano: '1544712660300000000',
          observedAt: 1_544_712_660_300,
          severityNumber: 9,
          severityText: 'test severity text',
          attributes: { event: { attribute: 'some event attribute' } },
          resource: { service: { name: 'my.service' } },
          scope: {
            name: 'my.library',
            version: '1.0.0',
            attributes: { my: { scope: { attribute: 'some scope attribute' } } },
          },
        },
      },
    ])
  })

  test('uses observed time when source time is absent', () => {
    const result = eventsFromOtlpJson({
      resourceLogs: [
        {
          scopeLogs: [
            {
              logRecords: [{ eventName: 'job.finished', observedTimeUnixNano: '2500000' }],
            },
          ],
        },
      ],
    })

    expect(result.trace[0]).toMatchObject({
      type: 'job.finished',
      at: 2,
      otel: { timestampSource: 'observedTimeUnixNano', observedAt: 2 },
    })
  })

  test('converts a real JavaScript SDK batch with multiple scopes', () => {
    const result = eventsFromOtlpJson(sdkFixture)

    expect(result.skippedLogRecords).toBe(1)
    expect(result.trace).toHaveLength(2)
    expect(result.trace[0]).toMatchObject({
      type: 'order.accepted',
      at: 1_700_000_000_123,
      body: {
        type: 'checkout-result',
        orderId: 'order-42',
        items: ['sku-1', 'sku-2'],
      },
      otel: {
        attributes: {
          order: { id: 'order-42' },
          customer: { tier: 'gold' },
          retry: { count: 0 },
        },
        resource: {
          service: { name: 'eventlaw-sdk-validation', version: '1.0.0' },
          deployment: { environment: { name: 'validation' } },
        },
        scope: { name: 'checkout.events', version: '2.3.0' },
      },
    })
    expect(result.trace[1]).toMatchObject({
      type: 'order.shipped',
      at: 1_700_000_005_987,
      otel: {
        attributes: {
          order: { id: 'order-42' },
          shipping: { carrier: { name: 'parcel-example' } },
        },
        scope: { name: 'fulfillment.events', version: '4.5.0' },
      },
    })
    expect(result.trace[1]).not.toHaveProperty('body')
  })

  test('runs one correlated law over the JavaScript SDK batch', () => {
    const { trace } = eventsFromOtlpJson(sdkFixture)
    const laws = defineLaws({
      acceptedOrdersShip: after(
        event('order.accepted').capture('orderId', 'otel.attributes.order.id'),
      )
        .eventually(event('order.shipped').equals('otel.attributes.order.id', ref('orderId')))
        .within(6_000)
        .partitionBy('otel.resource.service.name'),
    })

    expect(verifyTrace(trace, laws, { complete: true }).status).toBe('pass')
  })

  test('reports ordinary log records instead of silently treating them as events', () => {
    expect(
      eventsFromOtlpJson({
        resourceLogs: [{ scopeLogs: [{ logRecords: [{ body: { stringValue: 'log' } }] }] }],
      }),
    ).toEqual({ trace: [], skippedLogRecords: 1 })
  })

  test('keeps int64 values exact when they exceed safe integer precision', () => {
    const { trace } = eventsFromOtlpJson({
      resourceLogs: [
        {
          scopeLogs: [
            {
              logRecords: [
                {
                  eventName: 'counter.read',
                  timeUnixNano: '1000000',
                  body: { intValue: '9007199254740993' },
                },
              ],
            },
          ],
        },
      ],
    })

    expect(trace[0]?.body).toBe('9007199254740993')
  })

  test('makes dotted semantic attributes readable by matcher paths', () => {
    const first = eventsFromOtlpJson(officialFixture).trace[0]!
    const second = { ...first, at: first.at + 1 }
    const laws = defineLaws({
      onePageViewPerService: atMostOnce(event('browser.page_view')).per(
        'otel.resource.service.name',
      ),
    })

    expect(verifyTrace([first, second], laws).status).toBe('fail')
  })

  test.each([
    [
      'missing timestamp',
      { eventName: 'job.finished' },
      'requires timeUnixNano or observedTimeUnixNano',
    ],
    [
      'invalid timestamp',
      { eventName: 'job.finished', timeUnixNano: 'yesterday' },
      'expected a uint64',
    ],
    [
      'attribute namespace collision',
      {
        eventName: 'job.finished',
        timeUnixNano: '1000000',
        attributes: [
          { key: 'service', value: { stringValue: 'scalar' } },
          { key: 'service.name', value: { stringValue: 'nested' } },
        ],
      },
      'namespace collision',
    ],
  ])('rejects %s with an OTLP path', (_name, logRecord, message) => {
    const payload = { resourceLogs: [{ scopeLogs: [{ logRecords: [logRecord] }] }] }

    try {
      eventsFromOtlpJson(payload)
      throw new Error('expected conversion to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(OtlpEventError)
      expect((error as Error).message).toContain('$.resourceLogs[0].scopeLogs[0].logRecords[0]')
      expect((error as Error).message).toContain(message)
    }
  })
})
