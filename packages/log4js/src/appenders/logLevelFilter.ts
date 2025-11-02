import type LoggingEvent from '../LoggingEvent'
import type { AppenderFunction, Levels } from '../types/core'
import type { LogLevelFilterAppender } from '../types/appenders'

function logLevelFilter (
  minLevelString: string,
  maxLevelString: string,
  appender: AppenderFunction,
  levels: Levels
): AppenderFunction {
  const minLevel = levels.getLevel(minLevelString)!
  const maxLevel = levels.getLevel(maxLevelString, levels.FATAL)!

  return (logEvent: LoggingEvent): void => {
    const eventLevel = logEvent.level
    if (
      minLevel.isLessThanOrEqualTo(eventLevel) &&
      maxLevel.isGreaterThanOrEqualTo(eventLevel)
    ) {
      appender(logEvent)
    }
  }
}

function configure (
  config: LogLevelFilterAppender,
  _layouts: unknown,
  findAppender: (name: string) => AppenderFunction | false,
  levels: Levels
): AppenderFunction {
  const appender = findAppender(config.appender)
  if (!appender) {
    throw new Error(`Appender "${config.appender}" not found`)
  }
  return logLevelFilter(config.level, config.maxLevel || 'FATAL', appender, levels)
}

export { configure }
