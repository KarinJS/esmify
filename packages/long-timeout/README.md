# @karinjs/long-timeout

> Modern ESM implementation of long-timeout with full TypeScript support.

使用现代化语法（TypeScript + ESM + Node.js 18+）完全重写的 long-timeout，支持超过 2^31-1 毫秒（约 24.8 天）的超时和定时器。

## ✨ 特性

- 🚀 **现代化语法**：完全使用 TypeScript 和 ESM 重写
- 📦 **零依赖**：不依赖任何第三方包
- 🎯 **完整类型支持**：内置 TypeScript 类型定义
- 🔄 **兼容 API**：与 Node.js 原生定时器 API 保持一致
- 🪶 **轻量级**：打包后仅约 2KB
- ⏱️ **超长定时**：支持超过 24.8 天的超时和间隔

## 📦 安装

```bash
npm install @karinjs/long-timeout
```

## 🎯 使用场景

当你需要设置超过 2,147,483,647 毫秒（约 24.8 天）的定时器时，Node.js 的原生 `setTimeout` 和 `setInterval` 会立即触发。`long-timeout` 通过内部分段的方式解决了这个限制。

## 📖 使用示例

### 基础用法

```typescript
import { setTimeout, setInterval, clearTimeout, clearInterval } from '@karinjs/long-timeout'

// 设置一个超过 24.8 天的超时（这里示例 30 天）
const timeout = setTimeout(() => {
  console.log('30 天后执行！')
}, 30 * 24 * 60 * 60 * 1000) // 30 天

// 设置一个长间隔定时器（每 7 天执行一次）
const interval = setInterval(() => {
  console.log('每 7 天执行一次')
}, 7 * 24 * 60 * 60 * 1000) // 7 天

// 清除定时器
clearTimeout(timeout)
clearInterval(interval)
```

### 使用类

```typescript
import { Timeout, Interval } from '@karinjs/long-timeout'

// 创建一个 Timeout 实例
const timeout = new Timeout(() => {
  console.log('Timeout 触发！')
}, 3000000000) // 约 34.7 天

// 允许进程在此定时器激活时退出
timeout.unref()

// 阻止进程退出
timeout.ref()

// 取消定时器
timeout.close()

// 创建一个 Interval 实例
const interval = new Interval(() => {
  console.log('Interval 触发！')
}, 2592000000) // 30 天

interval.unref()
interval.close()
```

### 默认导出

```typescript
import longTimeout from '@karinjs/long-timeout'

const timeout = longTimeout.setTimeout(() => {
  console.log('使用默认导出')
}, 3000000000)

longTimeout.clearTimeout(timeout)
```

## 📚 API

### 函数

#### `setTimeout(listener: () => void, after: number): Timeout`

设置一个长超时定时器。

- **参数**：
  - `listener`: 超时后执行的回调函数
  - `after`: 延迟时间（毫秒）
- **返回**：`Timeout` 实例

#### `setInterval(listener: () => void, after: number): Interval`

设置一个长间隔定时器。

- **参数**：
  - `listener`: 每次间隔执行的回调函数
  - `after`: 间隔时间（毫秒）
- **返回**：`Interval` 实例

#### `clearTimeout(timer: Timeout | Interval | null | undefined): void`

清除一个定时器。

- **参数**：
  - `timer`: 要清除的定时器实例

#### `clearInterval(timer: Timeout | Interval | null | undefined): void`

清除一个定时器（`clearTimeout` 的别名）。

### 类

#### `Timeout`

长超时定时器类。

**构造函数**：

```typescript
constructor(listener: () => void, after: number)
```

**方法**：

- `unref(): void` - 允许 Node.js 进程在此定时器是唯一活跃定时器时退出
- `ref(): void` - 阻止 Node.js 进程退出
- `close(): void` - 取消超时定时器

#### `Interval`

长间隔定时器类。

**构造函数**：

```typescript
constructor(listener: () => void, after: number)
```

**方法**：

- `unref(): void` - 允许 Node.js 进程在此定时器是唯一活跃定时器时退出
- `ref(): void` - 阻止 Node.js 进程退出
- `close(): void` - 取消间隔定时器

## 🔧 工作原理

Node.js 的原生定时器使用 32 位整数存储延迟时间，最大值为 2^31-1（2,147,483,647 毫秒，约 24.8 天）。超过这个值会导致定时器立即触发。

`long-timeout` 通过以下方式解决这个问题：

1. 检查延迟时间是否超过 `TIMEOUT_MAX`（2^31-1）
2. 如果超过，则先设置一个 `TIMEOUT_MAX` 的定时器
3. 定时器触发后，减少剩余时间，并递归设置新的定时器
4. 重复直到剩余时间小于 `TIMEOUT_MAX`，然后设置最终的定时器

## 💡 注意事项

- 虽然支持超长定时器，但实际使用中要考虑进程可能会重启
- 使用 `unref()` 可以避免定时器阻止进程退出
- 长时间运行的定时器应考虑持久化到数据库或使用任务队列

## 📄 许可证

MIT

## 🔗 相关链接

- [GitHub 仓库](https://github.com/KarinJS/esmify)
- [问题反馈](https://github.com/KarinJS/esmify/issues)
