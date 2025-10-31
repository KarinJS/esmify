import debugFactory from 'debug'
import { join } from 'node:path'
import * as fileAppender from './file'
import type LoggingEvent from '../LoggingEvent'
import type { AppenderFunction, LayoutsParam } from '../types/core'
import type { MultiFileAppender } from '../types/appenders'

const debug = debugFactory('log4js:multiFile')

interface TimerInfo {
  timeout: number
  lastUsed: number
  interval: NodeJS.Timeout
}

interface AppenderWithShutdown extends AppenderFunction {
  shutdown: (cb: (err?: Error) => void) => void
}

const findFileKey = (property: string, event: LoggingEvent): string | undefined => {
  return (event as unknown as Record<string, unknown>)[property] as string | undefined ||
    event.context[property] as string | undefined
}

function configure (config: MultiFileAppender, layouts: LayoutsParam): AppenderWithShutdown {
  debug('Creating a multi-file appender')
  const files = new Map<string, AppenderWithShutdown>()
  const timers = new Map<string, TimerInfo>()

  function checkForTimeout (fileKey: string): void {
    const timer = timers.get(fileKey)
    const app = files.get(fileKey)

    if (timer && app) {
      if (Date.now() - timer.lastUsed > timer.timeout) {
        debug('%s not used for > %d ms => close', fileKey, timer.timeout)
        clearInterval(timer.interval)
        timers.delete(fileKey)
        files.delete(fileKey)
        app.shutdown((err?: Error) => {
          if (err) {
            debug('ignore error on file shutdown: %s', err.message)
          }
        })
      }
    } else {
      debug('timer or app does not exist')
    }
  }

  const appender = (logEvent: LoggingEvent): void => {
    const fileKey = findFileKey(config.property, logEvent)
    debug('fileKey for property ', config.property, ' is ', fileKey)

    if (fileKey) {
      let file = files.get(fileKey)
      debug('existing file appender is ', file)

      if (!file) {
        debug('creating new file appender')
        const fileConfig = {
          ...config,
          type: 'file' as const,
          filename: join(config.base, fileKey + (config.extension || '')),
        }
        file = fileAppender.configure(fileConfig, layouts) as AppenderWithShutdown
        files.set(fileKey, file)

        if (config.timeout) {
          debug('creating new timer')
          timers.set(fileKey, {
            timeout: config.timeout,
            lastUsed: Date.now(),
            interval: setInterval(
              () => checkForTimeout(fileKey),
              config.timeout
            ),
          })
        }
      } else if (config.timeout) {
        debug('%s extending activity', fileKey)
        const timer = timers.get(fileKey)
        if (timer) {
          timer.lastUsed = Date.now()
        }
      }

      file(logEvent)
    } else {
      debug('No fileKey for logEvent, quietly ignoring this log event')
    }
  }

  const appenderWithShutdown = appender as AppenderWithShutdown

  appenderWithShutdown.shutdown = (cb: (err?: Error) => void): void => {
    let shutdownFunctions = files.size
    if (shutdownFunctions <= 0) {
      cb()
      return
    }

    let error: Error | undefined

    timers.forEach((timer, fileKey) => {
      debug('clearing timer for ', fileKey)
      clearInterval(timer.interval)
    })

    files.forEach((app, fileKey) => {
      debug('calling shutdown for ', fileKey)
      app.shutdown((err?: Error) => {
        error = error || err
        shutdownFunctions -= 1
        if (shutdownFunctions <= 0) {
          cb(error)
        }
      })
    })
  }

  return appenderWithShutdown
}

export { configure }
