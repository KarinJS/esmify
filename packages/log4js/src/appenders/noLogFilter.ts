import debugModule from 'debug'
import { AppenderType } from './base'

import type { Configure, AppenderConfigBase } from './base'

const debug = debugModule('log4js:noLogFilter')

/**
 * 无日志过滤器 Appender 配置接口
 */
export interface NoLogFilterAppenderConfig extends AppenderConfigBase {
  type: 'noLogFilter'
  /** 要过滤的目标 Appender 名称 */
  appender: string
  /** 要排除的正则表达式字符串或字符串数组 */
  exclude: string | string[]
}

/**
 * 配置无日志过滤器 Appender
 * @param config - Appender 配置对象
 * @param layouts - 布局管理器
 * @param findAppender - 查找 Appender 的函数
 * @returns 配置好的无日志过滤器 Appender
 */
export const configure: Configure<NoLogFilterAppenderConfig> = (
  config,
  _layouts,
  findAppender
) => {
  const appender = findAppender(config.appender as unknown as AppenderType)
  const filters = (typeof config.exclude === 'string' ? [config.exclude] : config.exclude)
    .filter((el) => el != null && el !== '')
  const regex = new RegExp(filters.join('|'), 'i')

  return (logEvent) => {
    debug(`正在检查数据：${logEvent.data} 是否匹配过滤器：${filters}`)
    if (
      filters.length === 0 ||
      logEvent.data.findIndex((value) => regex.test(value)) < 0
    ) {
      debug('未排除，发送到 appender')
      appender(logEvent)
    }
  }
}
