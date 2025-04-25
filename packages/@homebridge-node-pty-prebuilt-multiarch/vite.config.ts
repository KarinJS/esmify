import { defineConfig } from 'vite'
import { builtinModules } from 'node:module'

export default defineConfig({
  build: {
    target: 'es2022',
    lib: {
      formats: ['es'],
      entry: [
        'node_modules/@homebridge/node-pty-prebuilt-multiarch/src/index.ts',
        'node_modules/@homebridge/node-pty-prebuilt-multiarch/src/worker/conoutSocketWorker.ts',
      ],
    },
    emptyOutDir: true,
    outDir: 'dist',
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map((mod) => `node:${mod}`),
        /\.node$/,
      ],
      output: {
        inlineDynamicImports: false,
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'index') {
            return `${chunkInfo.name}.mjs`
          }
          if (chunkInfo.facadeModuleId?.includes('src/worker')) {
            return `worker/${chunkInfo.name}.js`
          }
          return `chunk/${chunkInfo.name}.js`
        },
        chunkFileNames: 'chunk/[name]-[hash].js',
      },
      cache: false,
    },
    minify: false,
    commonjsOptions: {
      ignore: (id) => {
        if (id.includes('.node')) {
          return true
        }
        return false
      },
      include: [
        /node_modules/,
      ],
      exclude: [/\.node$/],
      extensions: ['.js', '.ts'],
      strictRequires: true,
      transformMixedEsModules: true,
      defaultIsModuleExports: true,
    },
  },
  plugins: [
    {
      name: 'esmify-plugin',
      enforce: 'post',
      generateBundle (_, bundle) {
        Object.keys(bundle).forEach(key => {
          const chunk = bundle[key]
          if (key === 'index.mjs' && chunk.type === 'chunk') {
            chunk.code = [
              'import { createRequire } from "node:module";',
              'import { fileURLToPath } from "node:url";',
              'import { dirname } from "node:path";',
              'const require = createRequire(import.meta.url);',
              'const __filename = fileURLToPath(import.meta.url);',
              'const __dirname = dirname(__filename);\n',
              chunk.code.replace(
                /function\s+commonjsRequire\s*\(\s*path2\s*\)\s*\{\s*throw\s+new\s+Error\([^)]+\);\s*\}/g,
                'function commonjsRequire(path2) {\n  return require("../build/Release/pty.node");\n}'
              ),
            ].join('\n')
          }
        })
      },
    },
  ],
})
