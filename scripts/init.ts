/* eslint-disable no-template-curly-in-string */
/* eslint-disable no-useless-escape */
import fs from 'node:fs'
import yaml from 'yaml'
import path from 'node:path'
import { execSync } from 'node:child_process'

const pkg = (dir: string, name: string) => {
  // 复制 package.json 模板文件
  const templatePath = path.join(process.cwd(), 'scripts', 'package.json')
  const targetPath = path.join(dir, 'package.json')

  // 读取模板内容并替换 ${name}
  let content = fs.readFileSync(templatePath, 'utf-8')
  content = content.replace(/\$\{name\}/g, name)

  fs.writeFileSync(targetPath, content)
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

  // tsconfig.json - 复制文件
  if (!fs.existsSync(path.join(dir, 'tsconfig.json'))) {
    fs.copyFileSync(path.join(process.cwd(), 'scripts', 'tsconfig.json'), path.join(dir, 'tsconfig.json'))
  }

  // tsdown.config.ts - 复制文件
  if (!fs.existsSync(path.join(dir, 'tsdown.config.ts'))) {
    fs.copyFileSync(path.join(process.cwd(), 'scripts', 'tsdown.config.ts'), path.join(dir, 'tsdown.config.ts'))
  }
}

(async () => {
  // pnpm run init <name> [additional-packages...]
  const packages = process.argv.slice(2)

  if (packages.length === 0) {
    console.error('\n❌ 请提供包名参数')
    console.log('\n使用方法:')
    console.log('  pnpm run init <package-name> [additional-packages...]')
    console.log('\n示例:')
    console.log('  pnpm run init lodash')
    console.log('  pnpm run init @types/node')
    console.log('  pnpm run init express body-parser cors')
    console.log('  pnpm run init axios @types/axios\n')
    process.exit(1)
  }

  // 第一个包作为主要包
  const mainPackage = packages[0]
  let name = mainPackage

  // 处理 scoped 包名
  if (name.includes('@')) {
    name = name.split('/')[1]
  }

  console.log(`\n📦 正在创建包: @karinjs/${name}`)
  if (packages.length > 1) {
    console.log(`📦 同时安装额外包: ${packages.slice(1).join(', ')}`)
  }

  const dir = path.resolve(process.cwd(), 'packages', name)

  // 检查目录是否已存在
  if (fs.existsSync(dir)) {
    console.error(`\n❌ 包目录 packages/${name} 已存在`)
    process.exit(1)
  }

  try {
    console.log('🔧 创建文件结构...')
    files(dir, name)

    console.log('📝 生成 package.json...')
    pkg(dir, name)

    console.log(' 配置发布设置...')
    release(dir, name)

    console.log('⚙️ 更新 CI 配置...')
    ci(dir, name)

    console.log('📦 安装依赖包...')
    // 安装所有包
    const packagesToInstall = packages.join(' ')
    execSync(`pnpm add ${packagesToInstall} -F @karinjs/${name} -D`, { stdio: 'inherit' })

    console.log(`\n✅ 包 @karinjs/${name} 创建完成!`)
    console.log(`📁 位置: packages/${name}`)
    console.log(`📦 已安装依赖: ${packages.join(' ')}`)
    console.log('\n下一步:')
    console.log(`  cd packages/${name}`)
    console.log('  # 编辑 src/index.ts 文件')
    console.log('  pnpm run build\n')
  } catch (error) {
    console.error('\n❌ 创建包时发生错误:')
    console.error(error)
    process.exit(1)
  }
})()
