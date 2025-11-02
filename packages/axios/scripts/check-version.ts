import semver from 'semver'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

interface PackageJson {
  name: string
  version: string
  devDependencies: {
    axios: string
  }
  [key: string]: any
}

// interface PackageVersions {
//   [key: string]: {
//     [version: string]: string
//   }
// }

// interface ReleaseManifest {
//   [key: string]: string
// }

interface NpmVersionInfo {
  versions: {
    [version: string]: any
  }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const ROOT_DIR = resolve(__dirname, '../../..')
const PACKAGE_DIR = resolve(__dirname, '..')
const PACKAGE_JSON_PATH = resolve(PACKAGE_DIR, 'package.json')

function readJson<T> (path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8'))
}

function writeJson (path: string, data: any): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

function execCommand (command: string, cwd: string = PACKAGE_DIR): void {
  console.log(`执行命令: ${command}`)
  console.log(`工作目录: ${cwd}`)
  try {
    execSync(command, {
      cwd,
      stdio: 'inherit',
    })
  } catch (error) {
    console.error(`\n❌ 命令执行失败: ${command}`)
    process.exit(1)
  }
}

async function getAxiosVersions (): Promise<string[]> {
  console.log('正在获取 axios 的所有版本...')
  const response = await fetch('https://registry.npmjs.org/axios')
  const data = await response.json() as NpmVersionInfo
  const versions = Object.keys(data.versions)

  // 过滤出正式版本（排除 alpha, beta, rc 等）
  const stableVersions = versions.filter(v => {
    // 只保留形如 x.y.z 的版本号
    return /^\d+\.\d+\.\d+$/.test(v)
  })

  // 按版本号排序
  return stableVersions.sort((a, b) => {
    const [aMajor, aMinor, aPatch] = a.split('.').map(Number)
    const [bMajor, bMinor, bPatch] = b.split('.').map(Number)

    if (aMajor !== bMajor) return aMajor - bMajor
    if (aMinor !== bMinor) return aMinor - bMinor
    return aPatch - bPatch
  })
}

async function getNewVersions (allVersions: string[], currentVersion: string): Promise<string[]> {
  console.log(`当前 devDependencies 中的版本: ${currentVersion}`)

  // 第一步：从 packages-version.json 获取已发布的版本
  // const packagesVersions = readJson<PackageVersions>(PACKAGES_VERSION_PATH)
  const publishedAxiosVersions = new Set<string>()

  console.log('packages-version.json 中已记录的 axios 版本:', Array.from(publishedAxiosVersions))

  // 第二步：从 npm 获取 @karinjs/axios 已发布的版本
  try {
    console.log('正在从 npm 获取 @karinjs/axios 的已发布版本...')
    const response = await fetch('https://registry.npmjs.org/@karinjs/axios')
    const data = await response.json() as NpmVersionInfo
    const karinAxiosVersions = Object.keys(data.versions)

    // 将 npm 上的版本也加入到已发布列表中
    karinAxiosVersions.forEach(v => {
      publishedAxiosVersions.add(v)
    })

    console.log(`npm 上 @karinjs/axios 已发布 ${karinAxiosVersions.length} 个版本`)
  } catch (error) {
    console.warn('⚠️  获取 npm 上的 @karinjs/axios 版本失败，将仅使用本地记录:', error instanceof Error ? error.message : String(error))
  }

  console.log('合并后的已发布版本总数:', publishedAxiosVersions.size)

  // 第三步：过滤出未发布的版本，并且版本号要大于当前版本
  const newVersions = allVersions.filter(v => {
    // 排除已发布的版本
    if (publishedAxiosVersions.has(v)) {
      return false
    }
    // 只保留大于当前版本的版本
    return semver.gt(v, currentVersion)
  })

  console.log(`找到 ${newVersions.length} 个新版本（> ${currentVersion}）`)
  return newVersions
}

function calculateNewPackageVersion (axiosVersion: string): string {
  // 直接使用 axios 的版本号作为 package 版本号
  return axiosVersion
}

function updatePackageJson (axiosVersion: string, packageVersion: string): void {
  const packageJson = readJson<PackageJson>(PACKAGE_JSON_PATH)
  packageJson.version = packageVersion
  packageJson.devDependencies.axios = axiosVersion
  writeJson(PACKAGE_JSON_PATH, packageJson)
  console.log(`已更新 package.json: version=${packageVersion}, axios=${axiosVersion}`)
}

function updatePackagesVersion (axiosVersion: string, packageVersion: string): void {
  // const packagesVersions = readJson<PackageVersions>(PACKAGES_VERSION_PATH)

  // if (!packagesVersions['@karinjs/axios']) {
  //   packagesVersions['@karinjs/axios'] = {}
  // }

  // packagesVersions['@karinjs/axios'][packageVersion] = `axios@${axiosVersion}`
  // writeJson(PACKAGES_VERSION_PATH, packagesVersions)
  console.log(`已更新 packages-version.json: ${packageVersion} -> axios@${axiosVersion}`)
}

function updateReleaseManifest (packageVersion: string): void {
  // const manifest = readJson<ReleaseManifest>(RELEASE_MANIFEST_PATH)
  // manifest['packages/axios'] = packageVersion
  // writeJson(RELEASE_MANIFEST_PATH, manifest)
  // console.log(`已更新 .release-please-manifest.json: packages/axios -> ${packageVersion}`)
}

async function publishVersion (axiosVersion: string): Promise<void> {
  console.log('\n========================================')
  console.log(`开始发布 axios@${axiosVersion}`)
  console.log('========================================\n')

  const packageVersion = calculateNewPackageVersion(axiosVersion)

  // 1. 更新 package.json
  updatePackageJson(axiosVersion, packageVersion)

  // 2. 安装依赖
  console.log('\n步骤 1/4: 安装依赖')
  execCommand('npx pnpm i -F @karinjs/axios --no-frozen-lockfile', ROOT_DIR)

  // 3. 构建
  console.log('\n步骤 2/4: 构建项目')
  execCommand('npx pnpm run build', PACKAGE_DIR)

  // 4. 测试
  console.log('\n步骤 3/4: 运行测试')
  execCommand('npx pnpm run test', PACKAGE_DIR)

  // 5. 发布
  console.log('\n步骤 4/4: 发布到 npm')
  execCommand('npx pnpm publish --access public --no-git-checks', PACKAGE_DIR)

  // 6. 更新版本记录
  updatePackagesVersion(axiosVersion, packageVersion)

  console.log(`\n✅ 成功发布 @karinjs/axios@${packageVersion} (axios@${axiosVersion})`)
}

async function main () {
  console.log('开始同步 axios 版本...\n')

  // 读取当前版本
  const packageJson = readJson<PackageJson>(PACKAGE_JSON_PATH)
  const currentVersion = packageJson.devDependencies.axios

  // 获取所有版本
  const allVersions = await getAxiosVersions()
  console.log(`共找到 ${allVersions.length} 个稳定版本`)

  // 获取需要发布的新版本
  const newVersions = await getNewVersions(allVersions, currentVersion)

  if (newVersions.length === 0) {
    console.log('\n没有新版本需要发布')
    return
  }

  console.log('\n准备发布以下版本:')
  newVersions.forEach(v => console.log(`  - axios@${v}`))
  console.log('\n自动开始发布流程...\n')

  // 循环发布所有新版本
  for (const axiosVersion of newVersions) {
    await publishVersion(axiosVersion)

    // 发布成功后等待一段时间，避免 npm 限流
    console.log('\n等待 5 秒后继续下一个版本...')
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  // 打印发布结果
  console.log('\n========================================')
  console.log('发布结果汇总')
  console.log('========================================\n')
  console.log(`✅ 成功发布 ${newVersions.length} 个版本`)
  newVersions.forEach(v => console.log(`  - axios@${v}`))

  // 更新 release manifest
  const finalPackageJson = readJson<PackageJson>(PACKAGE_JSON_PATH)
  updateReleaseManifest(finalPackageJson.version)
  execCommand('npx pnpm run sync', PACKAGE_DIR)
}

main()
