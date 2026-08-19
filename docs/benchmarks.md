# Benchmarks

Benchmarks are evidence for implementation choices, not universal throughput
claims. Run them on your own workload before deriving capacity numbers.

## Progress obligation insertion

This benchmark opens many long-lived progress obligations in one partition. No
consequence arrives and no deadline expires, so it isolates the cost of accepting
new triggers while earlier obligations remain pending.

```bash
npm run bench:progress
```

Environment for the first recorded run:

- Intel Core i7-14700K
- Windows
- Node.js 22.20.0
- seven samples per size; table output reports the median

### Evidence that triggered the index

The original implementation scanned every pending obligation on every event.
Five-sample medians from the same process shape were:

| Opened obligations |   Before |
| -----------------: | -------: |
|              1,000 |  7.44 ms |
|              2,000 | 18.10 ms |
|              4,000 | 76.27 ms |

Doubling from 2,000 to 4,000 increased time 4.2×, which is the expected shape of
quadratic work and justified changing the data structure.

### Indexed result

The monitor now keeps a per-partition set plus a deadline-ordered linked index.
It skips consequence matching when the event type cannot match and expires only
obligations whose deadlines have actually been reached.

The reproducible seven-sample run after the change was:

| Opened obligations |  Median | Events/ms |
| -----------------: | ------: | --------: |
|              1,000 | 1.24 ms |       806 |
|              2,000 | 1.03 ms |     1,948 |
|              4,000 | 1.07 ms |     3,746 |
|              8,000 | 2.49 ms |     3,210 |
|             16,000 | 4.60 ms |     3,475 |

Small timings are noisy and benefit from JIT warmup. The important result is the
curve: 16× more open obligations took roughly 3.7× the measured time instead of
approaching 256×.

Matching a real consequent still examines pending obligations in that event's
partition because each one may carry different capture bindings. That path needs
a separate real-schema benchmark before any capture-specific index is designed.
