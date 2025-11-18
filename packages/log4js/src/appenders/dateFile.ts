import os from 'os'
import { DateRollingFileStream } from '../streamroller'

import type { LoggingEvent } from '../core/LoggingEvent'
import type { Configure, AppenderConfigBase } from './base'
import type { DateRollingFileStreamOptions } from '../streamroller'

const eol = os.EOL

/**
 * 日期文件 Appender 配置接口
 */
export interface DateFileAppenderConfig extends DateRollingFileStreamOptions, AppenderConfigBase {
  type: 'dateFile'
  /** 基础文件名 */
  filename: string
  /**
   * 以下字符串可在 pattern 中识别:
   *  - yyyy : 完整年份,使用 yy 表示后两位
   *  - MM   : 月份
   *  - dd   : 日期
   *  - hh   : 小时（24 小时制)
   *  - mm   : 分钟
   *  - ss   : 秒
   *  - SSS  : 毫秒(虽然一般不会每毫秒滚动日志)
   *  - O    : 时区(大写字母 O）
   */
  pattern: string
  /** 最大日志文件大小（字节） */
  maxLogSize?: number
}

/**
 * 配置日期文件 Appender
 * @param config - Appender 配置对象
 * @param layouts - 布局管理器
 * @returns 配置好的日期文件 Appender
 */
export const configure: Configure<DateFileAppenderConfig, true> = (config, layouts) => {
  const layout = config.layout
    ? layouts.layout(config.layout.type, config.layout)
    : layouts.basicLayout

  if (!config.alwaysIncludePattern) {
    config.alwaysIncludePattern = false
  }

  // 安全默认值（而不是依赖 streamroller 的默认值）
  config.mode = config.mode || 0o600
  // 文件 appender 的选项使用 maxLogSize，
  // 但文档说任何文件 appender 选项也应该适用于 dateFile
  config.maxSize = config.maxLogSize

  const writer = new DateRollingFileStream(config.filename, config.pattern, config)
  writer.on('error', (err: Error) => {
    console.error(
      'log4js.dateFileAppender - 写入文件 %s 时发生错误 ',
      config.filename,
      err
    )
  })
  writer.on('drain', () => {
    process.emit('log4js:pause', false)
  })

  return Object.assign(
    (loggingEvent: LoggingEvent) => {
      if (!writer.writable) {
        return
      }
      if (!writer.write(layout(loggingEvent) + eol, 'utf8')) {
        process.emit('log4js:pause', true)
      }
    },
    {
      shutdown: (complete: () => void) => {
        writer.end('', 'utf-8', complete)
      },
    }
  )
}
