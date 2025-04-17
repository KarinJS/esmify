import fs from 'node:fs'
import { defineConfig } from 'vite'
import { builtinModules } from 'node:module'

/**
 * 需要做一个简单的替换处理.node模块
 */
const dir = './node_modules/sqlite3/lib/sqlite3-binding.js'
/** 判断其中是否存在import 不存在则进行替换 */
const content = fs.readFileSync(dir, 'utf-8')
if (!content.includes('import')) {
  fs.writeFileSync(dir,
    [
      'import { createRequire } from \'module\'',
      'const require = createRequire(import.meta.url)',
      'export const sqlite3 = require(\'../build/Release/node_sqlite3.node\')',
    ].join('\n')
  )
}

/** 替换require('./sqlite3-binding.js')的导入 */
const dir2 = './node_modules/sqlite3/lib/sqlite3.js'
const content2 = fs.readFileSync(dir2, 'utf-8')
if (content2.includes('require(\'./sqlite3-binding.js\');')) {
  fs.writeFileSync(dir2,
    content2.replace(
      'require(\'./sqlite3-binding.js\')',
      'require(\'./sqlite3-binding.js\').sqlite3'
    )
  )
}

export default defineConfig({
  build: {
    target: 'es2022',
    lib: {
      formats: ['es'],
      fileName: 'sqlite3',
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
})
