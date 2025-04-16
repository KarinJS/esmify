import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/**.ts'],
  format: 'esm',
  dts: { resolve: true, only: true },
  outDir: 'dist',
})
