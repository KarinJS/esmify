# @karinjs/log4js

[![npm version](https://img.shields.io/npm/v/@karinjs/log4js.svg)](https://www.npmjs.com/package/@karinjs/log4js)
[![license](https://img.shields.io/npm/l/@karinjs/log4js.svg)](https://github.com/KarinJS/esmify/blob/main/LICENSE)
[![node version](https://img.shields.io/node/v/@karinjs/log4js.svg)](https://nodejs.org)

基于 TypeScript + ESM 完全重写的 log4js，提供更强的类型支持和现代化的 API。这是一个 log4js 的 fork 版本，针对 Node.js 18+ 进行了优化。

## ✨ 特性

- 🚀 **TypeScript 重写**：完全使用 TypeScript 编写，提供完整的类型定义
- 📦 **零依赖**：打包后无任何运行时依赖
- 🎯 **ESM 优先**：原生支持 ES Modules
- 🔍 **上下文追踪**：新增上下文追踪 API，支持请求级别的日志收集
- 💪 **现代化**：要求 Node.js 18+，充分利用现代 Node.js 特性
- 🎨 **灵活配置**：支持多种 appenders 和 layouts

## 📦 安装

```bash
npm install @karinjs/log4js
```

```bash
pnpm add @karinjs/log4js
```

```bash
yarn add @karinjs/log4js
```

## 🚀 快速开始

### 基础使用

```typescript
import log4js from '@karinjs/log4js'

const logger = log4js.getLogger()
logger.level = 'debug'

logger.debug('这是一条调试日志')
logger.info('这是一条信息日志')
logger.warn('这是一条警告日志')
logger.error('这是一条错误日志')
```

### 配置 Logger

```typescript
import log4js from '@karinjs/log4js'

log4js.configure({
  appenders: {
    console: { type: 'console' },
    file: { 
      type: 'file', 
      filename: 'logs/app.log',
      maxLogSize: 10485760, // 10MB
      backups: 3
    }
  },
  categories: {
    default: { appenders: ['console', 'file'], level: 'info' }
  }
})

const logger = log4js.getLogger('app')
logger.info('Hello, log4js!')
```

## 🎯 新特性：上下文追踪 API

这是相比原版 log4js 的重要增强功能，支持在异步上下文中自动收集和追踪日志。

### runContext - 运行上下文

在一个上下文中运行函数，自动传播上下文 ID，适用于请求追踪、任务追踪等场景。

```typescript
import log4js from '@karinjs/log4js'

const logger = log4js.getLogger()

logger.runContext(() => {
  logger.info('请求开始')
  
  // 获取当前上下文的唯一 ID
  const id = logger.contextStore.getStore()?.id
  console.log(`上下文 ID: ${id}`)
  
  // 所有在此上下文中的日志都会被自动收集
  logger.debug('处理中...')
  logger.info('请求完成')
})

// 默认 10 秒后自动清理，可以自定义清理时间
logger.runContext(() => {
  logger.info('这个上下文会在 5 秒后清理')
}, 5000)
```

### getContextLogs - 获取上下文日志

获取当前上下文收集的所有日志。

```typescript
logger.runContext(() => {
  logger.info('日志 1')
  logger.warn('日志 2')
  logger.error('日志 3')
  
  // 获取当前上下文的所有日志
  const logs = logger.getContextLogs()
  console.log('收集到的日志:', logs)
  // 输出格式化后的日志数组
})
```

### setContextLayouts - 设置上下文日志格式

为上下文日志收集器设置自定义的布局格式。

```typescript
// 使用 pattern 布局
logger.setContextLayouts('pattern', {
  pattern: '%d{yyyy-MM-dd hh:mm:ss} [%p] %c - %m'
})

// 使用 basic 布局（默认）
logger.setContextLayouts('basic')

// 使用 colored 布局
logger.setContextLayouts('colored')

logger.runContext(() => {
  logger.info('这条日志会使用自定义格式')
  const logs = logger.getContextLogs()
  // logs 中的日志已经按照设置的 layout 格式化
})
```

### destroyContext - 销毁上下文

手动销毁指定上下文的日志收集器（通常不需要手动调用）。

```typescript
logger.runContext(() => {
  const id = logger.contextStore.getStore()?.id
  
  logger.info('一些日志')
  
  // 手动清理（通常不需要，runContext 会自动清理）
  if (id) {
    logger.destroyContext(id)
  }
})
```

### 实际应用场景

#### HTTP 请求追踪

```typescript
import express from 'express'
import log4js from '@karinjs/log4js'

const app = express()
const logger = log4js.getLogger('http')

app.use((req, res, next) => {
  logger.runContext(() => {
    const contextId = logger.contextStore.getStore()?.id
    
    logger.info(`[${contextId}] ${req.method} ${req.url}`)
    
    // 在请求处理过程中的所有日志都会被收集
    req.on('end', () => {
      // 获取这个请求相关的所有日志
      const requestLogs = logger.getContextLogs()
      
      // 可以将日志发送到监控系统、保存到数据库等
      if (res.statusCode >= 400) {
        console.error('请求失败，相关日志:', requestLogs)
      }
    })
    
    next()
  }, 30000) // 30秒后清理
})
```

#### 异步任务追踪

```typescript
async function processTask(taskId: string) {
  logger.runContext(() => {
    logger.info(`任务 ${taskId} 开始`)
    
    try {
      // 模拟异步操作
      await doSomething()
      logger.info(`任务 ${taskId} 处理中`)
      
      await doAnotherThing()
      logger.info(`任务 ${taskId} 完成`)
    } catch (error) {
      logger.error(`任务 ${taskId} 失败`, error)
      
      // 任务失败时，获取所有相关日志用于调试
      const logs = logger.getContextLogs()
      await saveErrorLogs(taskId, logs)
    }
  })
}
```

## 📚 API 文档

### Logger 方法

#### 日志级别方法

- `logger.trace(message, ...args)` - 追踪级别日志
- `logger.debug(message, ...args)` - 调试级别日志
- `logger.info(message, ...args)` - 信息级别日志
- `logger.warn(message, ...args)` - 警告级别日志
- `logger.error(message, ...args)` - 错误级别日志
- `logger.fatal(message, ...args)` - 致命级别日志
- `logger.mark(message, ...args)` - 标记级别日志

#### 级别检查

- `logger.isLevelEnabled(level)` - 检查是否启用了指定级别
- `logger.isTraceEnabled()` - 是否启用 TRACE 级别
- `logger.isDebugEnabled()` - 是否启用 DEBUG 级别
- `logger.isInfoEnabled()` - 是否启用 INFO 级别
- `logger.isWarnEnabled()` - 是否启用 WARN 级别
- `logger.isErrorEnabled()` - 是否启用 ERROR 级别
- `logger.isFatalEnabled()` - 是否启用 FATAL 级别

#### 上下文管理

- `logger.addContext(key, value)` - 添加上下文信息
- `logger.removeContext(key)` - 移除上下文信息
- `logger.clearContext()` - 清空上下文信息

#### 上下文追踪（新增）

- `logger.runContext(fn, ms?)` - 在上下文中运行函数
- `logger.getContextLogs()` - 获取当前上下文的日志
- `logger.setContextLayouts(name, config?)` - 设置上下文日志格式
- `logger.destroyContext(id)` - 销毁指定上下文

## ⚙️ 配置选项

### Appenders

支持多种 appender 类型：

- `console` - 控制台输出
- `file` - 文件输出
- `dateFile` - 按日期滚动的文件输出
- `multiFile` - 多文件输出
- `stderr` - 标准错误输出
- `stdout` - 标准输出

### Layouts

支持多种布局格式：

- `basic` - 基础布局
- `colored` / `coloured` - 彩色布局
- `messagePassThrough` - 消息透传
- `pattern` - 模式布局（支持自定义格式）
- `dummy` - 空布局

## 🔗 相关链接

- [GitHub 仓库](https://github.com/KarinJS/esmify)
- [问题反馈](https://github.com/KarinJS/log4js/issues)
- [原版 log4js](https://github.com/log4js-node/log4js-node)

## 📄 许可证

MIT License

## 🙏 致谢

本项目基于 [log4js-node](https://github.com/log4js-node/log4js-node) 进行重写和增强，感谢原作者的贡献。
