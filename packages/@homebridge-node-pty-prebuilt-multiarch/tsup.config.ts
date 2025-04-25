import fs from 'node:fs'
import { defineConfig } from 'tsup'

/**
 * 需要先把src复制到顶层
 */
if (!fs.existsSync('src')) {
  fs.cpSync('node_modules/@homebridge/node-pty-prebuilt-multiarch/src', 'src', { recursive: true, force: true })
}

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  outDir: 'dist',
  external: ['**/*.node'],
  dts: {
    resolve: true,
    only: true,
    footer: 'export type IPty = ITerminal',
  },
})
