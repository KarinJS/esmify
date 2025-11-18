import debugModule from 'debug'
import { AppenderType } from './base'

import type { Configure, AppenderConfigBase } from './base'

const debug = debugModule('log4js:categoryFilter')

/**
 * 分类过滤器 Appender 配置接口
 */
export interface CategoryFilterAppenderConfig extends AppenderConfigBase {
  type: 'categoryFilter'
  /** 要过滤的目标 Appender 名称 */
  appender: string
  /** 要排除的分类名称字符串或字符串数组 */
  exclude: string | string[]
}

/**
 * 配置分类过滤器 Appender
 * @param config - Appender 配置对象
 * @param layouts - 布局管理器
 * @param findAppender - 查找 Appender 的函数
 * @returns 配置好的分类过滤器 Appender
 */
export const configure: Configure<CategoryFilterAppenderConfig> = (
  config,
  _layouts,
  findAppender
) => {
  const appender = findAppender(config.appender as unknown as AppenderType)
  const excludes = typeof config.exclude === 'string' ? [config.exclude] : config.exclude

  return (logEvent) => {
    debug(`正在检查分类 ${logEvent.categoryName} 是否匹配排除列表 ${excludes}`)
    if (excludes.indexOf(logEvent.categoryName) === -1) {
      debug('未排除，发送到 appender')
      appender(logEvent)
    }
  }
}
