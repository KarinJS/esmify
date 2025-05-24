import { defineConfig } from 'vite'
import { builtinModules } from 'node:module'

export default defineConfig({
  build: {
    target: 'es2022',
    lib: {
      formats: ['cjs'],
      fileName: 'index',
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
    minify: false,
    commonjsOptions: {
      include: [
        /node_modules/,
      ],
      transformMixedEsModules: true,
      defaultIsModuleExports: true,
    },
  },
})
