import { createReadStream } from 'node:fs'
import { atMostOnce, defineLaws, event, formatReport, verifyTrace } from '../src/index.js'
import { readJsonl } from '../src/jsonl.js'

const traceUrl = new URL('./webhooks.jsonl', import.meta.url)
const trace = await readJsonl(createReadStream(traceUrl), { source: traceUrl.pathname })

const laws = defineLaws({
  noDuplicateDeliveryWithinRetryHorizon: atMostOnce(event('webhook.received'))
    .per('deliveryId')
    .within(24 * 60 * 60 * 1_000)
    .partitionBy('provider'),
})

console.log(formatReport(verifyTrace(trace, laws), trace))
