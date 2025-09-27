import type LoggingEvent from '../LoggingEvent'
import type { AppenderFunction } from '../types/core'

function configure (): AppenderFunction {
  return function (logEvent: LoggingEvent) {
    process.stdout.write(logEvent.data.map(item => String(item)).join(' ') + '\n')
  }
}

export { configure }
