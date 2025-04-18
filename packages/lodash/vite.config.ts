import { defineConfig } from 'vite'
import { copyFileSync } from 'node:fs'
import { builtinModules } from 'node:module'

export default defineConfig({
  build: {
    target: 'es2022',
    lib: {
      formats: ['es'],
      fileName: 'lodash',
      entry: ['src/index.ts'],
    },
    emptyOutDir: true,
    outDir: 'dist',
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map((mod) => `node:${mod}`),
      ],
      output: {
        inlineDynamicImports: true,
      },
      cache: false,
    },
    minify: 'terser',
    commonjsOptions: {
      include: [
        /node_modules/,
      ],
    },
  },
  plugins: [
    {
      name: 'copy-types',
      writeBundle () {
        copyFileSync(
          'index.js',
          'dist/index.js',
        )
      }
    }
  ],
})
