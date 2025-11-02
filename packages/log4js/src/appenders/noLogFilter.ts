import debugFactory from 'debug'
import type LoggingEvent from '../LoggingEvent'
import type { AppenderFunction } from '../types/core'
import type { NoLogFilterAppender } from '../types/appenders'

const debug = debugFactory('log4js:noLogFilter')

/**
 * The function removes empty or null regexp from the array
 */
function removeNullOrEmptyRegexp (regexp: (string | null | undefined)[]): string[] {
  return regexp.filter((el): el is string => el != null && el !== '')
}

/**
 * Returns a function that will exclude the events in case they match
 * with the regular expressions provided
 */
function noLogFilter (
  filters: string | string[],
  appender: AppenderFunction
): AppenderFunction {
  return (logEvent: LoggingEvent): void => {
    debug(`Checking data: ${logEvent.data} against filters: ${filters}`)

    let filterList = typeof filters === 'string' ? [filters] : filters
    filterList = removeNullOrEmptyRegexp(filterList)

    if (filterList.length === 0) {
      debug('No filters, sending to appender')
      appender(logEvent)
      return
    }

    const regex = new RegExp(filterList.join('|'), 'i')
    const hasMatch = logEvent.data.some((value) => regex.test(String(value)))

    if (!hasMatch) {
      debug('Not excluded, sending to appender')
      appender(logEvent)
    }
  }
}

function configure (
  config: NoLogFilterAppender,
  _layouts: unknown,
  findAppender: (name: string) => AppenderFunction | false
): AppenderFunction {
  const appender = findAppender(config.appender)
  if (!appender) {
    throw new Error(`Appender "${config.appender}" not found`)
  }
  return noLogFilter(config.exclude, appender)
}

export { configure }
