import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const pkg = (dir: string, name: string) => {
  const template = `{
  "name": "@karinjs/${name}",
  "version": "0.0.1",
  "description": "Use vite+tsup to recompile ${name} into esm, which is smaller in size.",
  "keywords": [
    "karinjs",
    "${name}"
  ],
  "homepage": "https://github.com/KarinJS/${name}",
  "bugs": {
    "url": "https://github.com/KarinJS/${name}/issues"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/KarinJS/${name}.git"
  },
  "license": "MIT",
  "author": "shijin",
  "type": "module",
  "main": "./index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist",
    "index.js"
  ],
  "scripts": {    
    "build": "vite build && tsup",
    "pub": "npm publish --access public",
    "sync": "curl -X PUT \\\"https://registry-direct.npmmirror.com/-/package/@karinjs/${name}/syncs\\\""
  },
  "engines": {
    "node": ">=18"
  },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org"
  }
}`
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(JSON.parse(template), null, 2))
}

const tsup = (dir: string) => {
  const template = `import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  dts: { resolve: true, only: true },
  outDir: 'dist',
})
`

  fs.writeFileSync(path.join(dir, 'tsup.config.ts'), template)
}

const vite = (dir: string, name: string) => {
  const template = `import { defineConfig } from 'vite'
import { builtinModules } from 'node:module'

export default defineConfig({
  build: {
    target: 'es2022',
    lib: {
      formats: ['es'],
      fileName: '${name}',
      entry: ['src/index.ts'],
    },
    emptyOutDir: true,
    outDir: 'dist',
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map((mod) => \`node:\${mod}\`),
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
  }
})
`

  fs.writeFileSync(path.join(dir, 'vite.config.ts'), template)
}

const main = (dir: string, name: string) => {
  const data = `import ${name} from './dist/${name}.js'
  
const app = ${name}.default
export default app
export * from './dist/${name}.js'
`
  fs.writeFileSync(path.join(dir, 'index.js'), data)
}

(async () => {
  // tsx init.ts --name=yaml
  const name = process.argv[2]?.split('=')[1]
  if (!name) {
    console.error('Please provide a name for the package.')
    process.exit(1)
  }

  const dir = path.resolve(process.cwd(), 'packages', name)
  fs.mkdirSync(dir, { recursive: true })
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'src', 'index.ts'), '')
  fs.copyFileSync('tsconfig.json', path.join(dir, 'tsconfig.json'))
  fs.writeFileSync(path.join(dir, 'index.js'), `export * from './dist/${name}.js'`)

  pkg(dir, name)
  vite(dir, name)
  main(dir, name)
  tsup(dir)

  execSync(`pnpm add ${name} -F @karinjs/${name} -D`, { stdio: 'inherit' })
  console.log('完成')
})()
