import type LoggingEvent from '../LoggingEvent'
import type { AppenderFunction, LayoutFunction, LayoutsParam } from '../types/core'
import type { StandardErrorAppender } from '../types/appenders'

function stderrAppender (layout: LayoutFunction, timezoneOffset?: number): AppenderFunction {
  return (loggingEvent: LoggingEvent) => {
    process.stderr.write(`${layout(loggingEvent, timezoneOffset)}\n`)
  }
}

function configure (config: StandardErrorAppender, layouts: LayoutsParam): AppenderFunction {
  let layout = layouts.colouredLayout
  if (config.layout) {
    layout = layouts.layout(config.layout.type, config.layout as Record<string, unknown>) || layout
  }
  return stderrAppender(layout, config.timezoneOffset)
}

export { configure }
