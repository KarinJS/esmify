/* eslint-disable @stylistic/indent */
import fs from 'node:fs'
import rfdc from 'rfdc'
import debugModule from 'debug'
import { Logger } from '@/core/logger'
import { layouts } from '@/core/layouts'
import appenders from '@/appenders'
import { clustering } from '@/core/clustering'
import { levels as level } from '@/core/levels'
import * as categories from '@/core/categories'
import { configuration } from '@/core/configuration'
import { connectLogger as connect } from '@/core/connect-logger'
import { recording as recordingModule } from '@/appenders/recording'

import type { } from '@/types/process'
import type { Levels, LevelConfig } from '@/core/levels'
import type { Config } from '@/appenders'
import type { LayoutMaker } from '@/core/layouts'
import type { LoggingEvent } from '@/core/LoggingEvent'
import type { FormatFunction, ConnectLoggerOptions } from '@/core/connect-logger'

/**
 * 日志方法类型
 */
type LogMethod = (message: any, ...args: any[]) => void

/**
 * 从自定义级别配置中提取级别方法名称
 * 将级别名称转换为驼峰式方法名（例如：MY_LEVEL -> myLevel，handler -> handler）
 */
type ExtractLevelMethods<T extends LevelConfig> = {
  [K in keyof T as K extends string
  ? Lowercase<K> extends `${infer First}_${infer Rest}`
  ? `${First}${Capitalize<Lowercase<Rest>>}`
  : Lowercase<K>
  : never]: LogMethod
}

/**
 * 扩展 Logger 类型，添加自定义级别方法
 */
type LoggerWithCustomLevels<T extends LevelConfig | undefined> =
  [T] extends [undefined]
  ? Logger
  : T extends LevelConfig
  ? Logger & ExtractLevelMethods<T>
  : Logger

const debug = debugModule('log4js:main')
const deepClone = rfdc({ proto: true })

export class Log4js<CustomLevels extends LevelConfig | undefined = undefined> {
  /**
   * 全局日志开关
   */
  static enabled: boolean = false

  /**
   * 将日志事件发送到对应的 appender
   * @param logEvent - 日志事件对象
   */
  sendLogEventToAppender (logEvent: LoggingEvent) {
    if (!Log4js.enabled) return
    debug('接收到日志事件：', logEvent)
    const categoryAppenders = categories.appendersForCategory(
      logEvent.categoryName
    )
    categoryAppenders.forEach((appender) => {
      appender(logEvent)
    })
  }

  /**
 * 从文件加载配置
 * @param filename - 配置文件路径
 * @returns 配置对象
 * @throws 当读取配置文件失败时抛出错误
 */
  loadConfigurationFile (filename: string): Config {
    debug(`正在从 ${filename} 加载配置`)
    try {
      return JSON.parse(fs.readFileSync(filename, 'utf8'))
    } catch (error) {
      throw new Error(
        `从文件 "${filename}" 读取配置时出现问题。错误信息：${(error as Error).message}`,
        { cause: error }
      )
    }
  }

  /**
   * 检查 log4js 是否已配置
   * @returns 如果已配置返回 true，否则返回 false
   */
  isConfigured () {
    return Log4js.enabled
  }

  /**
   * 获取录制模块
   * @returns recording 模块实例
   */
  recording () {
    return recordingModule
  }

  /**
   * 配置 log4js（使用配置对象）
   * @param configObject - 配置对象
   * @returns log4js 实例（如果配置了自定义级别，返回带有自定义级别类型的实例）
   */
  configure<
    A extends Record<string, import('@/appenders').ConfigAppendersValue>,
    T extends import('@/appenders').Config<A>
  > (
    configObject: T
  ): T extends { levels: infer L extends LevelConfig }
    ? Log4js<L>
    : Log4js<undefined>
  /**
   * 配置 log4js（使用配置文件路径）
   * @param configFilePath - 配置文件路径
   * @returns log4js 实例
   */
  configure (configFilePath: string): Log4js<undefined>
  /**
   * 配置 log4js 实现
   */
  configure<T extends Config<any>> (
    configObject: T | string
  ): T extends { levels: infer L extends LevelConfig }
    ? Log4js<L>
    : Log4js<undefined> {
    if (Log4js.enabled) this.shutdown()

    const cfg: Config<any> = typeof configObject === 'string'
      ? this.loadConfigurationFile(configObject)
      : configObject as Config<any>

    debug(`配置为：${cfg}`)

    configuration.configure(deepClone(cfg))
    clustering.onMessage(this.sendLogEventToAppender.bind(this))
    Log4js.enabled = true

    return this as any
  }

  /**
   * 关闭所有日志 appender。这将首先禁用所有对 appender 的写入，然后调用每个 appender 的关闭函数
   * @param callback - 当所有 appender 关闭后调用的回调函数。如果发生错误，回调函数将接收错误对象作为第一个参数
   */
  shutdown (callback: (error?: Error) => void = () => { }) {
    if (typeof callback !== 'function') {
      throw new TypeError('传递给 shutdown 的回调函数无效')
    }
    debug('调用关闭。禁用所有日志写入。')
    // 首先，禁用所有对 appender 的写入。这可以防止由于失控的日志写入导致 appender 无法被清空
    Log4js.enabled = false

    // 克隆以维护引用
    const appendersToCheck = Array.from(appenders.values())

    // 立即重置以防止内存泄漏
    appenders.init()
    categories.init()

    // 计算关闭函数的数量
    const shutdownFunctions = appendersToCheck.reduce(
      (accum, next) => 'shutdown' in next ? accum + 1 : accum,
      0
    )
    if (shutdownFunctions === 0) {
      debug('未找到具有关闭函数的 appender。')
      callback()
    }

    let completed = 0
    let error: Error | undefined
    debug(`找到 ${shutdownFunctions} 个具有关闭函数的 appender。`)
    function complete (err?: Error) {
      error = error || err
      completed += 1
      debug(`Appender 关闭完成：${completed} / ${shutdownFunctions}`)
      if (completed >= shutdownFunctions) {
        debug('所有关闭函数已完成。')
        callback(error)
      }
    }

    // 调用每个关闭函数
    appendersToCheck
      .filter((a) => (a as any)?.shutdown)
      .forEach((a) => 'shutdown' in a && a.shutdown(complete))
  }

  /**
   * 获取 logger 实例
   * @param category - 日志分类名称
   * @default 'default'
   */
  getLogger (category?: string): LoggerWithCustomLevels<CustomLevels> {
    if (!Log4js.enabled) {
      this.configure({
        appenders: { out: { type: 'stdout' } },
        categories: { default: { appenders: ['out'], level: 'off' } },
      })
    }

    return new Logger(category || 'default') as LoggerWithCustomLevels<CustomLevels>
  }

  /**
   * 添加自定义布局
   * @param name — 布局名称
   * @param serializerGenerator — 序列化生成器函数
   */
  addLayout (name: string, serializerGenerator: LayoutMaker) {
    return layouts.addLayout(name, serializerGenerator)
  }

  /**
   * 获取 Connect/Express 日志中间件
   * 使用给定的选项或格式字符串记录请求
   *
   * 选项：
   *   - `format`        格式字符串，支持的令牌见下方
   *   - `level`         log4js 日志级别实例，也支持 'auto'
   *   - `nolog`         排除目标日志的字符串、正则表达式或函数(req, res): boolean
   *   - `statusRules`   根据状态码设置特定日志级别的规则数组
   *   - `context`       是否将 express 响应对象添加到上下文
   *
   * 令牌：
   *   - `:req[header]` 例如：`:req[Accept]`
   *   - `:res[header]` 例如：`:res[Content-Length]`
   *   - `:http-version`
   *   - `:response-time`
   *   - `:remote-addr`
   *   - `:date`
   *   - `:method`
   *   - `:url`
   *   - `:referrer`
   *   - `:user-agent`
   *   - `:status`
   *
   * @param logger4js - log4js 日志记录器实例
   * @param options - 配置选项
   * @returns Express/Connect 中间件函数
   */
  connectLogger (
    logger4js: Logger,
    options?: string | FormatFunction | ConnectLoggerOptions
  ) {
    return connect(logger4js, options)
  }

  get levels (): Levels {
    return level
  }
}

/**
 * @name log4js
 * @namespace Log4js
 * @property getLogger
 * @property configure
 * @property shutdown
 */
export const log4js = new Log4js<undefined>()
