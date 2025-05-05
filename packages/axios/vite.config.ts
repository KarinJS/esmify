import fs from 'node:fs'
import { defineConfig } from 'vite'
import { builtinModules } from 'node:module'

/**
 * 复制lib文件夹出来
 */
if (fs.existsSync('lib')) {
  fs.rmSync('lib', { recursive: true })
}

fs.cpSync('node_modules/axios/lib', 'lib', { recursive: true })

export default defineConfig({
  build: {
    target: 'node18',
    lib: {
      formats: ['es'],
      fileName: () => 'index.mjs',
      entry: ['src/index.ts'],
    },
    emptyOutDir: true,
    outDir: 'dist',
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map((mod) => `node:${mod}`),
        'form-data',
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
  /**
   * 编译结束插件
   */
  plugins: [
    {
      name: 'axios-plugin',
      closeBundle () {
        fs.cpSync('./node_modules/axios/index.d.ts', './dist/index.d.ts')
      },
    },
  ],
})
