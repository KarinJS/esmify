import { AppenderType } from './base'

import type { Configure, AppenderConfigBase } from './base'

/**
 * 日志级别过滤器 Appender 配置接口
 */
export interface LogLevelFilterAppenderConfig extends AppenderConfigBase {
  type: 'logLevelFilter'
  /** 要过滤的目标 Appender 名称 */
  appender: string
  /** 最小日志级别 */
  level: string
  /** 最大日志级别 */
  maxLevel?: string
}

/**
 * 配置日志级别过滤器 Appender
 * @param config - Appender 配置对象
 * @param layouts - 布局管理器
 * @param findAppender - 查找 Appender 的函数
 * @param levels - 级别管理器
 * @returns 配置好的日志级别过滤器 Appender
 */
export const configure: Configure<LogLevelFilterAppenderConfig> = (
  config,
  _layouts,
  findAppender,
  levels
) => {
  const appender = findAppender(config.appender as unknown as AppenderType)
  const minLevel = levels.getLevel(config.level)
  const maxLevel = levels.getLevel(config.maxLevel as string, levels.FATAL)

  return (logEvent) => {
    const eventLevel = logEvent.level
    if (
      minLevel.isLessThanOrEqualTo(eventLevel) &&
      maxLevel.isGreaterThanOrEqualTo(eventLevel)
    ) {
      appender(logEvent)
    }
  }
}
