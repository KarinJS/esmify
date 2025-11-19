import { defineConfig } from 'tsdown/config'

export default defineConfig({
  entry: ['./src/index.ts'],
  outExtensions: (context) => {
    if (context.format === 'es') {
      return {
        js: '.mjs',
        dts: '.d.ts',
      }
    }

    return { js: '.cjs', dts: '.d.ts' }
  },
  dts: {
    resolve: true,
  },
  format: ['esm', 'cjs'],
  target: 'node18',
  platform: 'node',
  sourcemap: false,
  outDir: 'dist',
  clean: true,
  treeshake: true,
})
