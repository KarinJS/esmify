import type { Configure, AppenderConfigBase } from './base'

const consoleLog = console.log.bind(console)

/**
 * 控制台 Appender 配置接口
 */
export interface ConsoleAppenderConfig extends AppenderConfigBase {
  type: 'console'
  /**
   * @deprecated sb 鸟用没有这个参数
   */
  timezoneOffset?: number
}

/**
 * 配置控制台 Appender
 * @param config - Appender 配置对象
 * @param layouts - 布局管理器
 * @returns 配置好的控制台 Appender
 */
export const configure: Configure<ConsoleAppenderConfig> = (config, layouts) => {
  const layout = config.layout
    ? layouts.layout(config.layout.type, config.layout) || layouts.colouredLayout
    : layouts.colouredLayout

  return (loggingEvent) => consoleLog(layout(loggingEvent))
}
