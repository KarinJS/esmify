import path from 'path'
import debugModule from 'debug'
import { configure as fileAppenderConfigure } from './file'

import type { LoggingEvent } from '../core/LoggingEvent'
import type { Configure, AppenderConfigBase } from './base'
import type { FileAppenderConfig } from './file'

const debug = debugModule('log4js:multiFile')

/**
 * 多文件 Appender 配置接口
 */
export interface MultiFileAppenderConfig extends AppenderConfigBase, Omit<FileAppenderConfig, 'type' | 'filename'> {
  type: 'multiFile'
  /** 用于确定文件键的属性名 */
  property: string
  /** 基础目录路径 */
  base: string
  /** 文件扩展名 */
  extension: string
  /** 超时时间（毫秒） */
  timeout?: number
}

/**
 * 定时器信息接口
 */
interface TimerInfo {
  /** 超时时间（毫秒） */
  timeout: number
  /** 最后使用时间戳 */
  lastUsed: number
  /** 定时器句柄 */
  interval: NodeJS.Timeout
}

/**
 * 从日志事件中查找文件键
 * @param property - 属性名
 * @param event - 日志事件
 * @returns 文件键
 */
const findFileKey = (property: string, event: LoggingEvent) =>
  (event as any)[property] || event.context[property]

/**
 * 配置多文件 Appender
 * @param config - 配置对象
 * @param layouts - 布局管理器
 * @returns 配置好的多文件 Appender
 */
export const configure: Configure<MultiFileAppenderConfig> = (config, layouts, findAppender, levels) => {
  debug('Creating a multi-file appender')
  const files = new Map<string, ReturnType<typeof fileAppenderConfigure>>()
  const timers = new Map<string, TimerInfo>()

  function checkForTimeout (fileKey: string) {
    const timer = timers.get(fileKey)
    const app = files.get(fileKey)
    /* istanbul ignore else: failsafe */
    if (timer && app) {
      if (Date.now() - timer.lastUsed > timer.timeout) {
        debug('%s not used for > %d ms => close', fileKey, timer.timeout)
        clearInterval(timer.interval)
        timers.delete(fileKey)
        files.delete(fileKey)
        app.shutdown((err?: Error) => {
          if (err) {
            debug('ignore error on file shutdown: %s', err.message)
          }
        })
      }
    } else {
      // will never get here as files and timers are coupled to be added and deleted at same place
      debug('timer or app does not exist')
    }
  }

  const appender = ((logEvent: LoggingEvent) => {
    const fileKey = findFileKey(config.property, logEvent)
    debug('fileKey for property ', config.property, ' is ', fileKey)
    if (fileKey) {
      let file = files.get(fileKey)
      debug('existing file appender is ', file)
      if (!file) {
        debug('creating new file appender')
        const fileConfig: FileAppenderConfig = {
          ...config,
          type: 'file',
          filename: path.join(config.base, fileKey + config.extension),
        }
        file = fileAppenderConfigure(fileConfig, layouts, findAppender, levels)
        files.set(fileKey, file)
        if (config.timeout) {
          debug('creating new timer')
          timers.set(fileKey, {
            timeout: config.timeout,
            lastUsed: Date.now(),
            interval: setInterval(
              checkForTimeout.bind(null, fileKey),
              config.timeout
            ),
          })
        }
      } else if (config.timeout) {
        debug('%s extending activity', fileKey)
        timers.get(fileKey)!.lastUsed = Date.now()
      }

      file(logEvent)
    } else {
      debug('No fileKey for logEvent, quietly ignoring this log event')
    }
  }) as ReturnType<typeof fileAppenderConfigure>

  appender.shutdown = (cb: (err?: Error) => void): void => {
    let shutdownFunctions = files.size
    if (shutdownFunctions <= 0) {
      cb()
      return
    }
    let error: Error | undefined
    timers.forEach((timer, fileKey) => {
      debug('clearing timer for ', fileKey)
      clearInterval(timer.interval)
    })
    files.forEach((app, fileKey) => {
      debug('calling shutdown for ', fileKey)
      app.shutdown((err?: Error) => {
        error = error || err
        shutdownFunctions -= 1
        if (shutdownFunctions <= 0) {
          cb(error)
        }
      })
    })
  }

  return appender
}
