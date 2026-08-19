import {
  atMostOnce,
  createMonitor,
  defineLaws,
  event,
  formatReport,
  monitoringProfile,
  verifyTrace,
  type TraceEvent,
} from '../src/index.js'

const retryHorizonMs = 24 * 60 * 60 * 1_000

const laws = defineLaws({
  noDuplicateDeliveryWithinRetryHorizon: atMostOnce(event('webhook.received'))
    .per('deliveryId')
    .within(retryHorizonMs)
    .partitionBy('provider'),
})

const duplicateTrace: TraceEvent[] = [
  {
    type: 'webhook.received',
    provider: 'payments',
    deliveryId: 'delivery-42',
    at: 1_000,
  },
  {
    type: 'webhook.received',
    provider: 'payments',
    deliveryId: 'delivery-42',
    at: 1_500,
  },
]

console.log('Memory profile')
console.log(JSON.stringify(monitoringProfile(laws), null, 2))
console.log('\nRecorded duplicate')
console.log(formatReport(verifyTrace(duplicateTrace, laws), duplicateTrace))

const monitor = createMonitor(laws)
monitor.push(duplicateTrace[0]!)
monitor.advanceTo(duplicateTrace[0]!.at + retryHorizonMs + 1)
const reusedDelivery: TraceEvent = {
  type: 'webhook.received',
  provider: 'payments',
  deliveryId: 'delivery-42',
  at: duplicateTrace[0]!.at + retryHorizonMs + 1,
}

console.log('\nAfter the provider retry horizon')
console.log(JSON.stringify(monitor.stats(), null, 2))
console.log(formatReport(monitor.push(reusedDelivery), [duplicateTrace[0]!, reusedDelivery]))
