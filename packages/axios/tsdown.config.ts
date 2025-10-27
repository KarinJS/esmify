import fs from 'node:fs'
import { defineConfig } from 'tsdown/config'

export default defineConfig({
  entry: ['./node_modules/axios/index.js'],
  dts: false,
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  sourcemap: false,
  outDir: 'dist',
  clean: true,
  treeshake: true,
  hooks: {
    'build:prepare': async () => {
      fs.writeFileSync(
        './node_modules/axios/lib/platform/node/classes/FormData.js',
        'export default globalThis.FormData || FormData\n',
        'utf-8'
      )
    },
    'build:done': async () => {
      fs.renameSync('./dist/index.js', './dist/index.mjs')
      fs.copyFileSync('./node_modules/axios/index.d.ts', './dist/index.d.ts')
    },
  },
})
