import fs from 'node:fs'
import path from 'node:path'

import { fileURLToPath } from 'node:url'
import log4js from './dist/index.mjs'

console.time('log4js 压测用时')

const __filename = fileURLToPath(new URL('', import.meta.url))
const __dirname = path.dirname(__filename)

// 创建 heapsnapshot 目录
const snapshotDir = path.join(__dirname, 'heapsnapshots')
if (!fs.existsSync(snapshotDir)) {
  fs.mkdirSync(snapshotDir, { recursive: true })
}

// 配置 log4js
log4js.configure({
  appenders: {
    file: {
      type: 'file',
      filename: path.join(__dirname, 'logs', 'log4js.log'),
      maxLogSize: 10485760,
      backups: 3,
      compress: false,
    },
    console: {
      type: 'console',
    },
    dateFile: {
      type: 'dateFile',
      filename: path.join(__dirname, 'logs', 'datefile.log'),
      pattern: '.yyyy-MM-dd',
      compress: true,
      daysToKeep: 7,
    },
    test: {
      type: {
        configure: () => { },
      },
    },
  },
  categories: {
    default: {
      appenders: ['file', 'console', 'dateFile'],
      level: 'info',
    },
  },
  levels: {
    handler: { value: 15000, colour: 'cyan' },
  },
})

const logger = log4js.getLogger()

console.log('\n=== 测试父分类缺失场景 ===')
console.log('创建了 logger: app.database.mysql')
console.log('注意：app 和 app.database 这两个父分类并未在配置中定义')
console.log('它们会被隐式创建，以支持继承链\n')

function formatMB (bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

function logMemory (prefix = '') {
  const mem = process.memoryUsage()

  console.log('----------------------------')
  console.log(`[${prefix}] Node.js 内存占用:`)
  console.log(`RSS（总常驻内存）: ${formatMB(mem.rss)}`)
  console.log(`V8 Heap 总量: ${formatMB(mem.heapTotal)}, 已使用: ${formatMB(mem.heapUsed)}`)
  console.log(`外部内存 (C++ / Buffer): ${formatMB(mem.external)}`)
  console.log(`ArrayBuffer 内存: ${formatMB(mem.arrayBuffers || 0)}`)
  console.log('----------------------------\n')
}

// 获取初始内存占用
const startMemory = process.memoryUsage().rss / 1024 / 1024
console.log(`[Karin Logger] 开始内存占用: ${startMemory.toFixed(2)} MB`)

await new Promise(resolve => setTimeout(resolve, 3000))

console.log('[Karin Logger] 开始压测...')

// 先测试 mysql logger
console.log('\n--- 测试 mysql logger ---')
logger.debug('MySQL debug message')
logger.info('MySQL info message')
console.log('mysql logger 测试完成\n')

for (let i = 0; i < 100000; i++) {
  logger.debug(`This is debug message ${i + 1}`)
  logger.info(`This is info message ${i + 1}`)
  logger.warn(`This is warn message ${i + 1}`)
  logger.error(`This is error message ${i + 1}`)

  // 每1000条打印一次精细内存占用
  if ((i + 1) % 1000 === 0) {
    logMemory(`写入 ${(i + 1) * 4} 条日志`)
  }
}

// 压测完成后继续每秒打印精细内存占用 10 秒
for (let i = 0; i < 10; i++) {
  await new Promise(resolve => setTimeout(resolve, 1000))
  logMemory(`第${i + 1}秒`)
}

console.timeEnd('log4js 压测用时')
