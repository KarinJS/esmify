import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import axios from 'axios'

interface PackageJson {
  name: string
  version: string
  devDependencies: {
    axios: string
  }
  [key: string]: any
}

interface PackageVersions {
  [key: string]: {
    [version: string]: string
  }
}

interface ReleaseManifest {
  [key: string]: string
}

interface NpmVersionInfo {
  versions: {
    [version: string]: any
  }
}

const ROOT_DIR = resolve(__dirname, '../../..')
const PACKAGE_DIR = resolve(__dirname, '..')
const PACKAGE_JSON_PATH = resolve(PACKAGE_DIR, 'package.json')
const PACKAGES_VERSION_PATH = resolve(ROOT_DIR, 'packages-version.json')
const RELEASE_MANIFEST_PATH = resolve(ROOT_DIR, '.release-please-manifest.json')

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
      shell: 'pwsh.exe',
    })
  } catch (error) {
    console.error(`命令执行失败: ${command}`)
    throw error
  }
}

async function getAxiosVersions (): Promise<string[]> {
  console.log('正在获取 axios 的所有版本...')
  const response = await axios.get<NpmVersionInfo>('https://registry.npmjs.org/axios')
  const versions = Object.keys(response.data.versions)

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

function getNewVersions (allVersions: string[], currentVersion: string): string[] {
  console.log(`当前版本: ${currentVersion}`)

  // 获取已发布的版本
  const packagesVersions = readJson<PackageVersions>(PACKAGES_VERSION_PATH)
  const publishedAxiosVersions = new Set<string>()

  if (packagesVersions['@karinjs/axios']) {
    Object.values(packagesVersions['@karinjs/axios']).forEach(axiosVersion => {
      // 从 "axios@x.y.z" 中提取版本号
      const match = axiosVersion.match(/^axios@(.+)$/)
      if (match) {
        publishedAxiosVersions.add(match[1])
      }
    })
  }

  console.log('已发布的 axios 版本:', Array.from(publishedAxiosVersions))

  // 过滤出未发布的版本
  const newVersions = allVersions.filter(v => !publishedAxiosVersions.has(v))

  console.log(`找到 ${newVersions.length} 个新版本`)
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
  const packagesVersions = readJson<PackageVersions>(PACKAGES_VERSION_PATH)

  if (!packagesVersions['@karinjs/axios']) {
    packagesVersions['@karinjs/axios'] = {}
  }

  packagesVersions['@karinjs/axios'][packageVersion] = `axios@${axiosVersion}`
  writeJson(PACKAGES_VERSION_PATH, packagesVersions)
  console.log(`已更新 packages-version.json: ${packageVersion} -> axios@${axiosVersion}`)
}

function updateReleaseManifest (packageVersion: string): void {
  const manifest = readJson<ReleaseManifest>(RELEASE_MANIFEST_PATH)
  manifest['packages/axios'] = packageVersion
  writeJson(RELEASE_MANIFEST_PATH, manifest)
  console.log(`已更新 .release-please-manifest.json: packages/axios -> ${packageVersion}`)
}

async function publishVersion (axiosVersion: string): Promise<boolean> {
  try {
    console.log('\n========================================')
    console.log(`开始发布 axios@${axiosVersion}`)
    console.log('========================================\n')

    const packageVersion = calculateNewPackageVersion(axiosVersion)

    // 1. 更新 package.json
    updatePackageJson(axiosVersion, packageVersion)

    // 2. 安装依赖
    console.log('\n步骤 1/3: 安装依赖')
    execCommand('pnpm i -F @karinjs/axios', ROOT_DIR)

    // 3. 构建
    console.log('\n步骤 2/3: 构建项目')
    execCommand('pnpm run build', PACKAGE_DIR)

    // 4. 发布
    console.log('\n步骤 3/3: 发布到 npm')
    execCommand('pnpm run pub', PACKAGE_DIR)

    // 5. 更新版本记录
    updatePackagesVersion(axiosVersion, packageVersion)

    console.log(`\n✅ 成功发布 @karinjs/axios@${packageVersion} (axios@${axiosVersion})`)

    return true
  } catch (error) {
    console.error(`\n❌ 发布 axios@${axiosVersion} 失败:`, error)
    return false
  }
}

async function createPullRequest (): Promise<void> {
  console.log('\n========================================')
  console.log('准备创建 Pull Request')
  console.log('========================================\n')

  try {
    // 检查是否有修改
    const status = execSync('git status --porcelain', { cwd: ROOT_DIR }).toString()
    if (!status.trim()) {
      console.log('没有需要提交的修改')
      return
    }

    console.log('检测到以下修改:')
    console.log(status)

    // 创建新分支
    const branchName = `sync-axios-${Date.now()}`
    console.log(`\n创建新分支: ${branchName}`)
    execCommand(`git checkout -b ${branchName}`, ROOT_DIR)

    // 添加修改
    execCommand('git add .', ROOT_DIR)

    // 提交修改
    const commitMessage = 'chore(axios): sync new axios versions'
    execCommand(`git commit -m "${commitMessage}"`, ROOT_DIR)

    // 推送分支
    console.log('\n推送分支到远程仓库')
    execCommand(`git push origin ${branchName}`, ROOT_DIR)

    console.log('\n✅ 已推送分支，请手动在 GitHub 上创建 Pull Request')
    console.log(`分支名称: ${branchName}`)
  } catch (error) {
    console.error('\n❌ 创建 PR 失败:', error)
  }
}

async function main () {
  try {
    console.log('开始同步 axios 版本...\n')

    // 读取当前版本
    const packageJson = readJson<PackageJson>(PACKAGE_JSON_PATH)
    const currentVersion = packageJson.devDependencies.axios

    // 获取所有版本
    const allVersions = await getAxiosVersions()
    console.log(`共找到 ${allVersions.length} 个稳定版本`)

    // 获取需要发布的新版本
    const newVersions = getNewVersions(allVersions, currentVersion)

    if (newVersions.length === 0) {
      console.log('\n没有新版本需要发布')
      return
    }

    console.log('\n准备发布以下版本:')
    newVersions.forEach(v => console.log(`  - axios@${v}`))
    console.log('\n自动开始发布流程...\n')

    const results: { version: string; success: boolean }[] = []

    // 循环发布所有新版本
    for (const axiosVersion of newVersions) {
      const success = await publishVersion(axiosVersion)
      results.push({ version: axiosVersion, success })

      if (success) {
        // 发布成功后等待一段时间，避免 npm 限流
        console.log('\n等待 5 秒后继续下一个版本...')
        await new Promise(resolve => setTimeout(resolve, 5000))
      } else {
        // 发布失败，继续下一个版本
        console.log('\n发布失败，继续下一个版本...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // 打印发布结果
    console.log('\n========================================')
    console.log('发布结果汇总')
    console.log('========================================\n')

    results.forEach(({ version, success }) => {
      const status = success ? '✅ 成功' : '❌ 失败'
      console.log(`${status} axios@${version}`)
    })

    const successCount = results.filter(r => r.success).length
    console.log(`\n共发布 ${successCount}/${results.length} 个版本`)

    // 更新 release manifest
    if (successCount > 0) {
      const packageJson = readJson<PackageJson>(PACKAGE_JSON_PATH)
      updateReleaseManifest(packageJson.version)

      // 创建 PR
      await createPullRequest()
    }
  } catch (error) {
    console.error('\n发生错误:', error)
    process.exit(1)
  }
}

main()
