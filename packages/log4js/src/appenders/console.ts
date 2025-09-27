/**
 * Console appender - 输出到stdout/stderr
 */
import LoggingEvent from '../LoggingEvent'
import type { AppenderFunction, LayoutsParam } from '../types/core'
import type { ConsoleAppender } from '../types/appenders'

const configure = (config: ConsoleAppender, layouts: LayoutsParam): AppenderFunction => {
  const layoutType = (config.layout?.type as string) || 'colored'
  const layout = layouts.layout(layoutType, config.layout as Record<string, unknown>) || layouts.colouredLayout

  return (loggingEvent: LoggingEvent): void => {
    // ERROR和FATAL级别输出到stderr，其他输出到stdout
    if (loggingEvent.level.isGreaterThanOrEqualTo('ERROR')) {
      process.stderr.write(layout(loggingEvent) + '\n')
    } else {
      process.stdout.write(layout(loggingEvent) + '\n')
    }
  }
}

export {
  configure,
}
