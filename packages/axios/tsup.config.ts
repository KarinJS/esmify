import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/types.ts'],
  format: ['esm'],
  dts: { resolve: true, only: true },
  clean: false,
  outDir: 'dist',
})
