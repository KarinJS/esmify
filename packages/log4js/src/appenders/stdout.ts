import type { Configure, AppenderConfigBase } from './base'

/**
 * 标准输出 Appender 配置接口
 */
export interface StdoutAppenderConfig extends AppenderConfigBase {
  type: 'stdout'
  /** 时区偏移量（分钟） */
  timezoneOffset?: number
}

/**
 * 配置标准输出 Appender
 * @param config - Appender 配置对象
 * @param layouts - 布局管理器
 * @returns 配置好的标准输出 Appender
 */
export const configure: Configure<StdoutAppenderConfig> = (config, layouts) => {
  const layout = config.layout
    ? layouts.layout(config.layout.type, config.layout) || layouts.colouredLayout
    : layouts.colouredLayout

  return (loggingEvent) => {
    process.stdout.write(`${layout(loggingEvent)}\n`)
  }
}
