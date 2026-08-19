export function readPath(value: unknown, path: string): unknown {
  if (path.length === 0) return value

  let current = value
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null || !(segment in current)) {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

export function stableKey(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (typeof value === 'number' && Number.isNaN(value)) return 'number:NaN'
  if (typeof value === 'object' && value !== null) return `object:${JSON.stringify(value)}`
  return `${typeof value}:${String(value)}`
}
