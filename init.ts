/* eslint-disable no-template-curly-in-string */
/* eslint-disable no-useless-escape */
import fs from 'node:fs'
import yaml from 'yaml'
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

const release = (_: string, name: string) => {
  const config = JSON.parse(fs.readFileSync('.release-please-config.json', 'utf-8'))
  config.packages[`packages/${name}`] = {
    'release-type': 'node',
    'package-name': `@karinjs/${name}`,
    component: name,
    'tag-separator': '-',
    scope: name,
  }
  fs.writeFileSync('.release-please-config.json', JSON.stringify(config, null, 2))

  const manifest = JSON.parse(fs.readFileSync('.release-please-manifest.json', 'utf-8'))
  manifest[`packages/${name}`] = '0.0.1'
  fs.writeFileSync('.release-please-manifest.json', JSON.stringify(manifest, null, 2))
}

const ci = (_: string, name: string) => {
  const config = yaml.parse(fs.readFileSync('.github/workflows/release.yml', 'utf-8'))
  config.jobs['release-please'].outputs[`${name}_rerelease`] = `\${{ steps.release.outputs['packages/${name}--release_created'] }}`
  /** 新增一个发布包任务 */
  config.jobs.publish.steps.push({
    name: `发布 ${name} 包`,
    if: `\${{ needs.release-please.outputs.${name}_rerelease == 'true' }}`,
    env: {
      NODE_AUTH_TOKEN: '\${{ secrets.NPM_TOKEN }}',
    },
    'working-directory': `packages/${name}`,
    run: 'pnpm run build && pnpm run pub',
  })
  fs.writeFileSync('.github/workflows/release.yml', yaml.stringify(config))
}

const files = (dir: string, name: string) => {
  fs.mkdirSync(dir, { recursive: true })
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true })
  // src/index.ts
  if (!fs.existsSync(path.join(dir, 'src', 'index.ts'))) {
    fs.writeFileSync(path.join(dir, 'src', 'index.ts'), '')
  }

  // tsconfig.json
  if (!fs.existsSync(path.join(dir, 'tsconfig.json'))) {
    fs.copyFileSync('tsconfig.json', path.join(dir, 'tsconfig.json'))
  }

  // index.js
  if (!fs.existsSync(path.join(dir, 'index.js'))) {
    fs.writeFileSync(path.join(dir, 'index.js'), `export * from './dist/${name}.js'`)
  }
}

(async () => {
  // pnpm run init <name>
  const name = process.argv[2]?.replace(/\//g, '-')
  if (!name) {
    console.error('Please provide a name for the package.')
    process.exit(1)
  }

  const dir = path.resolve(process.cwd(), 'packages', name)
  files(dir, name)
  pkg(dir, name)
  vite(dir, name)
  main(dir, name)
  release(dir, name)
  ci(dir, name)
  tsup(dir)

  execSync(`pnpm add ${process.argv[2]} -F @karinjs/${name} -D`, { stdio: 'inherit' })
  console.log('完成')
})()
