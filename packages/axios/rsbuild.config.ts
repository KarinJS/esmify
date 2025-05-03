import { defineConfig } from '@rsbuild/core'
import { pluginDts } from 'rsbuild-plugin-dts'

export default defineConfig({
  source: {
    entry: {
      index: './src/index.ts',
    },
  },
  output: {
    target: 'node',
    minify: false,
  },
  plugins: [pluginDts()],
})
