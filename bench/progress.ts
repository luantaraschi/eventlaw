import { performance } from 'node:perf_hooks'
import { after, createMonitor, defineLaws, event } from '../src/index.js'

const laws = defineLaws({
  progresses: after(event('trigger'))
    .eventually(event('done'))
    .within(1_000_000_000)
    .partitionBy('scope'),
})

const sizes = [1_000, 2_000, 4_000, 8_000, 16_000]
const sampleCount = 7

console.log('Open progress obligations in one partition')
console.log('events\tmedian ms\tevents/ms')

for (const size of sizes) {
  const samples: number[] = []

  for (let run = 0; run < sampleCount; run += 1) {
    const monitor = createMonitor(laws)
    const started = performance.now()

    for (let index = 0; index < size; index += 1) {
      monitor.push({ type: 'trigger', scope: 'same', id: index, at: index })
    }

    samples.push(performance.now() - started)
  }

  samples.sort((left, right) => left - right)
  const median = samples[Math.floor(samples.length / 2)]!
  console.log(`${size}\t${median.toFixed(2)}\t\t${(size / median).toFixed(0)}`)
}
