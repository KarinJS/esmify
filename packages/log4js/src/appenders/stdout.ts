import type LoggingEvent from '../LoggingEvent'
import type { AppenderFunction, LayoutFunction, LayoutsParam } from '../types/core'
import type { StandardOutputAppender } from '../types/appenders'

function stdoutAppender (layout: LayoutFunction, timezoneOffset?: number): AppenderFunction {
  return (loggingEvent: LoggingEvent) => {
    process.stdout.write(`${layout(loggingEvent, timezoneOffset)}\n`)
  }
}

function configure (config: StandardOutputAppender, layouts: LayoutsParam): AppenderFunction {
  let layout = layouts.colouredLayout
  if (config.layout) {
    layout = layouts.layout(config.layout.type, config.layout as Record<string, unknown>) || layout
  }
  return stdoutAppender(layout, config.timezoneOffset)
}

export { configure }
