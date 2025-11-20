import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { } from '../src/appenders/index'
import { configure } from '../src'

console.time('log4js 压测用时')

const __filename = fileURLToPath(new URL('', import.meta.url))
const __dirname = path.dirname(__filename)

// 创建 heapsnapshot 目录
const snapshotDir = path.join(__dirname, 'heapsnapshots')
if (!fs.existsSync(snapshotDir)) {
  fs.mkdirSync(snapshotDir, { recursive: true })
}

/**
 * 配置接口
 */
export interface Config1 {
  /** Appenders 配置对象 */
  appenders: {}
  /** 分类配置对象 */
  categories: {
    [key: string]: {}
    default: {} // 必须有 default 分类
  }
  /** pm2是否启用 */
  pm2?: boolean
  /** pm2 环境变量名称 */
  pm2InstanceVar?: string
  /** 自定义日志级别配置 */
  levels?: Record<string, {
    /** 级别值 */
    value: number
    /** 级别颜色 */
    colour: {}
  }>
  /** 是否禁用集群功能 */
  disableClustering?: boolean
}

// 配置 log4js
const logger = configure({
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
    test: {
      type: 'dateFile',
      filename: path.join(__dirname, 'logs', 'datefile.log'),
      pattern: '.yyyy-MM-dd',
      compress: true,
      daysToKeep: 7,
    },
    test1: {
      type: 'fileSync',
      filename: path.join(__dirname, 'logs', 'filesync.log'),
    },
    errors: {
      /** 错误日志过滤器 */
      type: 'logLevelFilter',
      /** 目标appender */
      appender: 'errorFile',
      /** 只记录错误级别及以上的日志 */
      level: 'error',
    },
  },
  categories: {
    default: {
      appenders: ['file'], // ❌ file2 不存在
      level: 'info',
    },
  },
  levels: {
    handler: { value: 999999, colour: 'cyan' },
  },
})
  .getLogger('app')

// logger.level

logger.runContext(async () => {
  console.log(logger.handler('这是一个自定义级别的日志消息'))
  return 'test'
})
