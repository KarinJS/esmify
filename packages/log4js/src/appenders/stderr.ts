import type { Configure, AppenderConfigBase } from './base'

/**
 * 标准错误输出 Appender 配置接口
 */
export interface StderrAppenderConfig extends AppenderConfigBase {
  type: 'stderr'
  /** 时区偏移量（分钟） */
  timezoneOffset?: number
}

/**
 * 配置标准错误输出 Appender
 * @param config - Appender 配置对象
 * @param layouts - 布局管理器
 * @returns 配置好的标准错误输出 Appender
 */
export const configure: Configure<StderrAppenderConfig> = (config, layouts) => {
  const layout = config.layout
    ? layouts.layout(config.layout.type, config.layout) || layouts.colouredLayout
    : layouts.colouredLayout

  return (loggingEvent) => {
    process.stderr.write(`${layout(loggingEvent)}\n`)
  }
}
