import os from 'os'
import path from 'path'
import debugModule from 'debug'
import { RollingFileStream } from '../streamroller'

import type { LoggingEvent } from '../core/LoggingEvent'
import type { Configure, AppenderConfigBase } from './base'
import type { RollingFileWriteStreamOptions } from '../streamroller'

const debug = debugModule('log4js:file')

/**
 * 文件 Appender 类
 */
class FileAppender {
  /** 行尾符 */
  private static readonly eol = os.EOL

  /** 主 SIGHUP 监听器是否已启动 */
  private static mainSighupListenerStarted = false

  /** SIGHUP 监听器集合 */
  private static sighupListeners = new Set<FileAppender>()

  /**
   * 主 SIGHUP 处理器
   * 当接收到 SIGHUP 信号时，调用所有注册的 appender 的处理器
   */
  private static mainSighupHandler (): void {
    FileAppender.sighupListeners.forEach((app) => {
      app.sighupHandler()
    })
  }

  private writer: RollingFileStream
  private layout: (loggingEvent: LoggingEvent, timezoneOffset?: number) => string
  private file: string
  private config: FileAppenderConfig
  private numBackups: number

  constructor (
    file: string,
    layout: (loggingEvent: LoggingEvent, timezoneOffset?: number) => string,
    config: FileAppenderConfig,
    numBackups: number
  ) {
    this.file = file
    this.layout = layout
    this.config = config
    this.numBackups = numBackups
    this.writer = this.createWriter()

    // 注册 SIGHUP 监听器
    FileAppender.sighupListeners.add(this)
    if (!FileAppender.mainSighupListenerStarted) {
      process.on('SIGHUP', FileAppender.mainSighupHandler)
      FileAppender.mainSighupListenerStarted = true
    }
  }

  /**
   * 创建滚动文件流
   */
  private createWriter () {
    const writer = new RollingFileStream(
      this.file,
      this.config.maxLogSize,
      this.numBackups,
      this.config
    )
    writer.on('error', (err: Error) => {
      console.error('log4js.fileAppender - 写入文件 %s 时发生错误 ', this.file, err)
    })
    writer.on('drain', () => {
      process.emit('log4js:pause', false)
    })
    return writer
  }

  /**
   * 写入日志事件
   */
  log (loggingEvent: LoggingEvent): void {
    if (!this.writer.writable) {
      return
    }
    if (this.config.removeColor === true) {
      // eslint-disable-next-line no-control-regex
      const regex = /\x1b[[0-9;]*m/g
      loggingEvent.data = loggingEvent.data.map((d) => {
        if (typeof d === 'string') return d.replace(regex, '')
        return d
      })
    }
    if (!this.writer.write(this.layout(loggingEvent, this.config.timezoneOffset) + FileAppender.eol, 'utf8')) {
      process.emit('log4js:pause', true)
    }
  }

  /**
   * 重新打开文件
   */
  reopen (): void {
    this.writer.end(() => {
      this.writer = this.createWriter()
    })
  }

  /**
   * SIGHUP 信号处理器
   */
  sighupHandler (): void {
    debug('SIGHUP handler called.')
    this.reopen()
  }

  /**
   * 关闭 Appender
   */
  shutdown (complete: () => void): void {
    FileAppender.sighupListeners.delete(this)
    if (FileAppender.sighupListeners.size === 0 && FileAppender.mainSighupListenerStarted) {
      process.removeListener('SIGHUP', FileAppender.mainSighupHandler)
      FileAppender.mainSighupListenerStarted = false
    }
    this.writer.end('', 'utf-8', complete)
  }
}

/**
 * 文件 Appender 配置接口
 */
export interface FileAppenderConfig extends AppenderConfigBase, RollingFileWriteStreamOptions {
  type: 'file'
  /** 日志文件名 */
  filename: string
  /** 最大日志文件大小（字节） */
  maxLogSize?: number
  /** 备份文件数量 */
  backups?: number
  /** 时区偏移量（分钟） */
  timezoneOffset?: number
  /** 是否移除颜色代码 */
  removeColor?: boolean
}

/**
 * 配置文件 Appender
 * @param config - Appender 配置对象
 * @param layouts - 布局管理器
 * @returns 配置好的文件 Appender
 */
export const configure: Configure<FileAppenderConfig, true> = (config, layouts) => {
  const layout = config.layout
    ? layouts.layout(config.layout.type, config.layout) || layouts.colouredLayout
    : layouts.basicLayout

  // 安全默认值（而不是依赖 streamroller 的默认值）
  config.mode = config.mode || 0o600

  // 处理文件路径
  let file = config.filename
  if (typeof file !== 'string' || file.length === 0) {
    throw new Error(`无效的文件名: ${file}`)
  } else if (file.endsWith(path.sep)) {
    throw new Error(`文件名是一个目录: ${file}`)
  } else if (file.indexOf(`~${path.sep}`) === 0) {
    // 处理 ~ 扩展: https://github.com/nodejs/node/issues/684
    // 排除 ~ 和 ~filename，因为这些可以是有效的文件
    file = file.replace('~', os.homedir())
  }
  file = path.normalize(file)

  const numBackups = !config.backups && config.backups !== 0 ? 5 : config.backups

  debug(
    'Creating file appender (',
    file,
    ', ',
    config.maxLogSize,
    ', ',
    numBackups,
    ', ',
    config,
    ', ',
    config.timezoneOffset,
    ')'
  )

  // 创建 FileAppender 实例
  const appender = new FileAppender(file, layout, config, numBackups)

  // 在接收到 SIGHUP 信号时，关闭并重新打开所有文件
  // 这使得此 appender 可以与 logrotate 配合使用
  // 注意：如果使用 logrotate，则不应设置 `maxLogSize`

  // 返回带有 shutdown 方法的函数
  return Object.assign(
    (loggingEvent: LoggingEvent) => appender.log(loggingEvent),
    {
      shutdown: (complete: () => void) => appender.shutdown(complete),
    }
  )
}
