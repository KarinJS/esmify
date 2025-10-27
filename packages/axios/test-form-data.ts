/**
 * Axios Form-Data 功能测试 Demo
 * 直接测试 @karinjs/axios 的 form-data 功能
 */

import axios from './dist/index.mjs'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as http from 'http'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 创建测试文件
const testDir = join(__dirname, 'test-files')
if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true })

const testFile = join(testDir, 'test.txt')
writeFileSync(testFile, 'Test file content for upload')

// 测试服务器
let server: http.Server | null = null
const createServer = (): Promise<{ srv: http.Server; port: number }> => {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      console.log(`\n📥 ${req.method} ${req.url}`)
      console.log(`📋 Content-Type: ${req.headers['content-type']}`)

      let body = ''
      req.on('data', chunk => {
        body += chunk
      })
      req.on('end', () => {
        console.log(`📦 Body: ${body.length} bytes`)
        if (body.length < 800) console.log(body)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          ok: true,
          size: body.length,
          type: req.headers['content-type'],
        }))
      })
    })

    srv.listen(0, () => {
      const port = (srv.address() as { port: number }).port
      console.log(`\n✅ 服务器启动: http://localhost:${port}\n`)
      resolve({ srv, port })
    })
  })
}

// 测试函数
const test = (name: string, fn: () => Promise<void>) => {
  return async () => {
    try {
      console.log(`\n▶ 测试: ${name}`)
      await fn()
      console.log(`✅ ${name} - 通过`)
    } catch (e: any) {
      console.log(`❌ ${name} - 失败:`, e.message)
    }
  }
}

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

// 主函数
async function main () {
  const { srv, port } = await createServer()
  server = srv
  const url = `http://localhost:${port}`

  // 测试1: 基本对象
  await test('基本对象转form-data', async () => {
    const res = await axios.post(`${url}/test1`,
      { name: 'test', value: 123 },
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    console.log('  响应:', res.data)
  })()

  await delay(200)

  // 测试2: URLSearchParams
  await test('URLSearchParams', async () => {
    const params = new URLSearchParams()
    params.append('key1', 'value1')
    params.append('key2', 'value2')
    const res = await axios.post(`${url}/test2`, params)
    console.log('  响应:', res.data)
  })()

  await delay(200)

  // 测试3: 数组
  await test('数组字段', async () => {
    const res = await axios.post(`${url}/test3`,
      { items: ['a', 'b', 'c'], nums: [1, 2, 3] },
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    console.log('  响应:', res.data)
  })()

  await delay(200)

  // 测试4: 中文和特殊字符
  await test('中文和特殊字符', async () => {
    const res = await axios.post(`${url}/test4`,
      { chinese: '中文测试', emoji: '😀🎉', special: '!@#$%' },
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    console.log('  响应:', res.data)
  })()

  await delay(200)

  // 测试5: 嵌套对象
  await test('嵌套对象', async () => {
    const res = await axios.post(`${url}/test5`,
      { user: { name: 'John', age: 30 }, config: { theme: 'dark' } },
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    console.log('  响应:', res.data)
  })()

  await delay(200)

  // 测试6: Buffer数据
  await test('Buffer数据', async () => {
    const content = readFileSync(testFile)
    const res = await axios.post(`${url}/test6`,
      { file: content, desc: 'file upload' },
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    console.log('  响应:', res.data)
  })()

  await delay(200)

  // 测试7: 大量字段
  await test('大量字段', async () => {
    const data: Record<string, string> = {}
    for (let i = 0; i < 30; i++) data[`f${i}`] = `v${i}`
    const res = await axios.post(`${url}/test7`, data,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    console.log('  响应:', res.data)
  })()

  await delay(200)

  // 测试8: JSON字段
  await test('JSON字段', async () => {
    const res = await axios.post(`${url}/test8`,
      { json: JSON.stringify({ a: 1, b: 2 }), arr: JSON.stringify([1, 2, 3]) },
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    console.log('  响应:', res.data)
  })()

  await delay(200)

  // 测试9: 边界值
  await test('边界值', async () => {
    const res = await axios.post(`${url}/test9`,
      { empty: '', zero: 0, false: false, ok: 'yes' },
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    console.log('  响应:', res.data)
  })()

  await delay(200)

  // 测试10: 配置项
  await test('Axios配置', async () => {
    const res = await axios.post(`${url}/test10`,
      { test: 'config', time: Date.now() },
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 5000,
        maxContentLength: 50000,
      }
    )
    console.log('  响应:', res.data)
  })()

  console.log('\n' + '='.repeat(50))
  console.log('🎉 所有测试完成!')
  console.log('='.repeat(50) + '\n')

  server.close(() => {
    console.log('✅ 服务器已关闭\n')
    process.exit(0)
  })
}

main().catch((e: any) => {
  console.error('❌ 错误:', e)
  if (server) server.close()
  process.exit()
})
