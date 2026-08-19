import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/fast-check.ts', 'src/jsonl.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node22',
})
