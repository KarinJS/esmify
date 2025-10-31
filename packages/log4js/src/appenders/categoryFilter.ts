import debugFactory from 'debug'
import type LoggingEvent from '../LoggingEvent'
import type { AppenderFunction } from '../types/core'
import type { CategoryFilterAppender } from '../types/appenders'

const debug = debugFactory('log4js:categoryFilter')

function categoryFilter (
  excludes: string | string[],
  appender: AppenderFunction
): AppenderFunction {
  const excludeList = typeof excludes === 'string' ? [excludes] : excludes

  return (logEvent: LoggingEvent): void => {
    debug(`Checking ${logEvent.categoryName} against ${excludeList}`)
    if (!excludeList.includes(logEvent.categoryName)) {
      debug('Not excluded, sending to appender')
      appender(logEvent)
    }
  }
}

async function configure (
  config: CategoryFilterAppender,
  _layouts: unknown,
  findAppender: (name: string) => Promise<AppenderFunction | false>
): Promise<AppenderFunction> {
  const appender = await findAppender(config.appender || '')
  if (!appender) {
    throw new Error(`Appender "${config.appender}" not found`)
  }
  return categoryFilter(config.exclude || [], appender)
}

export { configure }
