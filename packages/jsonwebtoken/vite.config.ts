import fs from 'node:fs'
import { defineConfig } from 'vite'
import { builtinModules } from 'node:module'

export default defineConfig({
  build: {
    target: 'es2022',
    lib: {
      formats: ['es'],
      fileName: 'jsonwebtoken',
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
      ]
    },
  },
  /** 编译成功之后将node_modules/@types/ms/index.d.ts 带有export这一行修改为export = ms */
  plugins: [
    {
      name: 'copy-types',
      writeBundle () {
        const dir = 'node_modules/@types/ms/index.d.ts'
        const content = fs.readFileSync(dir, 'utf-8')
        fs.writeFileSync(dir, content.replace(/export.*/, 'type StringValue = ms.StringValue\nexport { StringValue }'))
      }
    }
  ],
})
