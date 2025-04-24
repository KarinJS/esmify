import { defineConfig } from 'vite'
import { builtinModules } from 'node:module'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

execSync('npm pkg delete exports && npm pkg delete browser', { cwd: './node_modules/ws' })

export default defineConfig({
  build: {
    target: 'node18',
    lib: {
      formats: ['es'],
      entry: ['src/index.ts'],
    },
    emptyOutDir: true,
    outDir: 'dist',
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map((mod) => `node:${mod}`),
        'bufferutil',
        'utf-8-validate',
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
      name: 'require -> import',
      writeBundle () {
        /**
         * utf-8-validate不再需要 因为编译之后要求最低版本为node18
         */

        /** 替换动态require */
        const dir = 'dist/index.js'
        const data = readFileSync(dir, 'utf8')
        const reg = /const (.*) = require\("bufferutil"\);([\s\S]*?)catch \(e\) {/
        const newCode = data.replace(reg, (match, variableName, codeBlock) => {
          return `
            import("bufferutil")
              .then((${variableName}) => {
                ${codeBlock.trim()})
        .catch((e) => {
        });
    } catch (e) {`
        })
        writeFileSync(dir, newCode, 'utf8')

        /**
         * 修改类型声明
         */
        const types = './node_modules/@types/ws'
        const typesData = readFileSync(`${types}/index.d.mts`, 'utf8').replace(/export import/g, 'export type')
        writeFileSync(`${types}/index.d.mts`, typesData, 'utf8')
        writeFileSync(`${types}/index.d.ts`, typesData, 'utf8')
      },
    },
  ],
})
