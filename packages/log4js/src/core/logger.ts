import debugModule from 'debug'
import { levels } from './levels'
import { LayoutCfg, layouts } from './layouts'
import { clustering } from './clustering'
import * as categories from './categories'
import { LoggingEvent } from './LoggingEvent'
import { configuration } from './configuration'
import { AsyncLocalStorage } from 'node:async_hooks'

import type { Level } from './levels'
import type { LayoutFunction, layoutMakers } from './layouts'

const debug = debugModule('log4js:logger')

/** 调用栈匹配正则表达式 */
const stackReg = /^(?:\s*)at (?:(.+) \()?(?:([^(]+?):(\d+):(\d+))\)?$/

/**
 * 顶部条目是 Error
 */
const baseCallStackSkip = 1

/**
 * _log 函数有 3 层深度，我们需要跳过这些才能到达调用点
 */
const defaultErrorCallStackSkip = 3

/**
 * 调用栈信息接口
 */
export interface CallStack {
  /** 函数名 */
  functionName: string
  /** 文件名 */
  fileName: string
  /** 行号 */
  lineNumber: number
  /** 列号 */
  columnNumber: number
  /** 跳过行后的堆栈字符串 */
  callStack: string
  /** 类名 */
  className: string
  /** 函数别名 */
  functionAlias: string
  /** 调用者名称 */
  callerName: string
}

/**
 * 解析调用栈函数类型
 */
type ParseCallStackFunction = (error: Error, skipIdx: number) => CallStack | null

/**
 * 默认解析调用栈函数
 * @param data - Error 对象
 * @param skipIdx - 要跳过的堆栈行数
 * @returns 调用栈信息或 null
 */
function defaultParseCallStack (
  data: Error,
  skipIdx: number = defaultErrorCallStackSkip + baseCallStackSkip
): CallStack | null {
  try {
    const stacklines = data.stack!.split('\n').slice(skipIdx)
    if (!stacklines.length) {
      // 此堆栈中没有堆栈
      // 如果设置了 skipIdx，我们应该尝试前一个索引吗？
      return null
    }
    const lineMatch = stackReg.exec(stacklines[0])
    /* istanbul ignore else: failsafe */
    if (lineMatch && lineMatch.length === 5) {
      // 提取类名、函数名和别名
      let className = ''
      let functionName = ''
      let functionAlias = ''
      if (lineMatch[1] && lineMatch[1] !== '') {
        // 警告：如果别名不存在，这将取消设置别名
        [functionName, functionAlias] = lineMatch[1]
          .replace(/[[\]]/g, '')
          .split(' as ')
        functionAlias = functionAlias || ''

        if (functionName.includes('.')) { [className, functionName] = functionName.split('.') }
      }

      return {
        fileName: lineMatch[2],
        lineNumber: parseInt(lineMatch[3], 10),
        columnNumber: parseInt(lineMatch[4], 10),
        callStack: stacklines.join('\n'),
        className,
        functionName,
        functionAlias,
        callerName: lineMatch[1] || '',
      }
      // eslint-disable-next-line no-else-return
    } else {
      // 除非 Node.js 对 Error 进行了更改，否则永远不会到达这里
      console.error('log4js.logger - defaultParseCallStack 错误') // eslint-disable-line no-console
    }
  } catch (err) {
    // 除非 Node.js 对 Error 进行了重大更改，否则永远不会出错
    console.error('log4js.logger - defaultParseCallStack 错误', err) // eslint-disable-line no-console
  }
  return null
}

/**
 * Logger 类 - 用于记录日志消息
 * @author Stephan Strittmatter
 */
class Logger {
  /** 日志分类名称 */
  category: string
  /** 日志上下文 */
  context: Record<string, any>
  /** 调用栈跳过索引 */
  private callStackSkipIndex: number
  /** 解析调用栈函数 */
  private parseCallStack: ParseCallStackFunction
  /** @description AsyncLocalStorage 实例，用于存储上下文ID */
  contextStore = new AsyncLocalStorage<{ id: string }>()
  /** 日志收集器 */
  private collectors: Record<string, string[]> = {}
  /** 收集器的layouts */
  private collectorsLayouts: LayoutFunction | null = null

  /**
   * 创建 Logger 实例
   * @param name - 要记录到的分类名称
   */
  constructor (name: string) {
    if (!name) {
      throw new Error('未提供分类')
    }

    levels.levels.forEach(addLevelMethods)

    this.category = name
    this.context = {}
    this.callStackSkipIndex = 0
    this.parseCallStack = defaultParseCallStack
    debug(`Logger 已创建 (${this.category}, ${this.level})`)
  }

  trace (message: any, ...args: any[]) {
    this.log(levels.TRACE, message, ...args)
  }

  debug (message: any, ...args: any[]) {
    this.log(levels.DEBUG, message, ...args)
  }

  info (message: any, ...args: any[]) {
    this.log(levels.INFO, message, ...args)
  }

  warn (message: any, ...args: any[]) {
    this.log(levels.WARN, message, ...args)
  }

  error (message: any, ...args: any[]) {
    this.log(levels.ERROR, message, ...args)
  }

  fatal (message: any, ...args: any[]) {
    this.log(levels.FATAL, message, ...args)
  }

  mark (message: any, ...args: any[]) {
    this.log(levels.MARK, message, ...args)
  }

  /**
   * 获取当前日志级别
   */
  get level (): Level {
    return levels.getLevel(
      categories.getLevelForCategory(this.category),
      levels.OFF
    )
  }

  /**
   * 设置当前日志级别
   */
  set level (level: Level | string) {
    categories.setLevelForCategory(
      this.category,
      levels.getLevel(level, this.level)
    )
  }

  /**
   * 获取是否启用调用栈
   */
  get useCallStack (): boolean {
    return categories.getEnableCallStackForCategory(this.category)
  }

  /**
   * 设置是否启用调用栈
   */
  set useCallStack (bool: boolean) {
    categories.setEnableCallStackForCategory(this.category, bool === true)
  }

  /**
   * 获取要跳过的调用栈行数
   */
  get callStackLinesToSkip (): number {
    return this.callStackSkipIndex
  }

  /**
   * 设置要跳过的调用栈行数
   */
  set callStackLinesToSkip (number: number) {
    if (typeof number !== 'number') {
      throw new TypeError('必须是数字')
    }
    if (number < 0) {
      throw new RangeError('必须 >= 0')
    }
    this.callStackSkipIndex = number
  }

  /**
   * 记录日志
   * @param level - 日志级别或消息
   * @param args - 要记录的参数
   */
  log (level: Level | string | any, ...args: any[]): void {
    const logLevel = levels.getLevel(level)
    if (!logLevel) {
      if (configuration.validIdentifier(level) && args.length > 0) {
        // 未找到 logLevel 但具有有效签名，在回退到 INFO 之前发出警告
        this.log(
          levels.WARN,
          'log4js:logger.log: 未找到有效的日志级别作为第一个参数：',
          level
        )
        return this.log(levels.INFO, `[${level}]`, ...args)
      }

      return this.log(levels.INFO, level, ...args)
    }

    if (this.isLevelEnabled(logLevel)) {
      return this._log(logLevel, args)
    }

    debug(`日志级别未启用，跳过日志记录 (${logLevel}，${this.category})`)
  }

  /**
   * 检查是否启用了指定级别
   * @param otherLevel - 要检查的级别
   * @returns 是否启用
   */
  isLevelEnabled (otherLevel: Level | string): boolean {
    return this.level.isLessThanOrEqualTo(otherLevel)
  }

  /**
   * 内部日志方法
   * @param level - 日志级别
   * @param data - 日志数据
   */
  private _log (level: Level, data: any[]): void {
    debug(`发送日志数据 (${level}) 到 appenders`)
    const error = data.find((item) => item instanceof Error) as Error | undefined
    let callStack: CallStack | null | undefined
    if (this.useCallStack) {
      try {
        if (error) {
          callStack = this.parseCallStack(
            error,
            this.callStackSkipIndex + baseCallStackSkip
          )
        }
      } catch (_err) {
        // 忽略错误并使用创建新 Error 的原始方法
      }
      callStack =
        callStack ||
        this.parseCallStack(
          new Error(),
          this.callStackSkipIndex +
          defaultErrorCallStackSkip +
          baseCallStackSkip
        )
    }
    const loggingEvent = new LoggingEvent(
      this.category,
      level,
      data,
      this.context,
      callStack || undefined,
      error
    )

    clustering.send(loggingEvent)
    this.collectorsLog(loggingEvent)
  }

  /**
   * 添加上下文
   * @param key - 键
   * @param value - 值
   */
  addContext (key: string, value: any): void {
    this.context[key] = value
  }

  /**
   * 移除上下文
   * @param key - 键
   */
  removeContext (key: string): void {
    delete this.context[key]
  }

  /**
   * 清空上下文
   */
  clearContext (): void {
    this.context = {}
  }

  /**
   * 设置解析调用栈的函数
   * @param parseFunction - 解析函数或 undefined
   */
  setParseCallStackFunction (parseFunction?: ParseCallStackFunction): void {
    if (typeof parseFunction === 'function') {
      this.parseCallStack = parseFunction
    } else if (typeof parseFunction === 'undefined') {
      this.parseCallStack = defaultParseCallStack
    } else {
      throw new TypeError('传递给 setParseCallStackFunction 的类型无效')
    }
  }

  /**
   * @description 在一个上下文中运行函数，自动传播上下文ID
   * @param fn - 需要运行的函数
   * @param ms - 任务完成后，自动销毁存储的上下文日志的时间（毫秒），默认 10 * 1000
   * @returns 函数的返回值
   * @example
   * ```ts
   * logger.runContext(() => {
   *   logger.info('This log is within a context');
   * });
   *
   * // 可以在上下文中获取唯一的ID
   * const id = logger.contextStore.getStore()?.id;
   * console.log(`上下文 ID: ${id}`);
   *
   * 可通过ID获取此上下文相关的日志
   * ```
   */
  public runContext<T> (fn: () => T, ms = 10 * 1000): T {
    const id = crypto.randomUUID()
    try {
      return this.contextStore.run({ id }, fn)
    } finally {
      setTimeout(() => this.destroyContext(id), ms)
    }
  }

  /**
   * 获取当前上下文收集的日志
   * @returns 日志数组
   */
  public getContextLogs (): string[] {
    const store = this.contextStore.getStore()
    if (store) {
      return this.collectors[store.id] || []
    }
    return []
  }

  /**
   * 结束当前上下文的日志收集
   * @param id - 上下文ID
   * @description 此方法一般不需要手动 如果需要调用，请参考如下示例
   * @example
   * ```ts
   * logger.runContext(() => {
   *   const id = logger.contextStore.getStore()?.id;
   *   logger.destroyContext(id!); // 手动销毁上下文日志收集器（通常不需要）
   * });
   * ```
   */
  public destroyContext (id: string) {
    this.collectors[id] && delete this.collectors[id]
  }

  /**
   * 设置上下文日志收集器的布局
   * @param name - 布局名称
   * @param config - 非`pattern`无需配置对象，`pattern`布局必选配置对象
   * @returns 布局函数
   */

  public setContextLayouts<T extends keyof typeof layoutMakers> (
    name: T,
    config?: LayoutCfg<T>
  ) {
    const fn = layouts.layout(name, config)
    this.collectorsLayouts = fn
  }

  /**
   * @description 收集当前上下文的日志
   * @param loggingEvent - 日志事件对象
   */
  private async collectorsLog (loggingEvent: LoggingEvent): Promise<void> {
    const store = this.contextStore.getStore()
    if (!store) return
    if (!this.collectors[store.id]) this.collectors[store.id] = []
    this.collectors[store.id].push(this.getLayoutLogs(loggingEvent))
  }

  /**
   * 获取layout后的日志
   */
  private get getLayoutLogs () {
    if (!this.collectorsLayouts || typeof this.collectorsLayouts !== 'function') {
      return layouts.basicLayout
    }

    return this.collectorsLayouts
  }
}

/**
 * 为 Logger 原型添加级别方法
 * @param target - 目标级别
 */
function addLevelMethods (target: Level | string): void {
  const level = levels.getLevel(target)

  const levelStrLower = level.toString().toLowerCase()
  const levelMethod = levelStrLower.replace(/_([a-z])/g, (g) =>
    g[1].toUpperCase()
  )

  /** 将级别方法名称转换为大写 */
  const isLevelMethod = levelMethod[0].toUpperCase() + levelMethod.slice(1)

  // @ts-ignore
  Logger.prototype[`is${isLevelMethod}Enabled`] = function (this: Logger): boolean {
    return this.isLevelEnabled(level)
  }

  // @ts-ignore
  Logger.prototype[levelMethod] = function (this: Logger, ...args: any[]): void {
    this.log(level, ...args)
  }
}

levels.levels.forEach(addLevelMethods)

configuration.addListener(() => {
  levels.levels.forEach(addLevelMethods)
})

export { Logger }
