import debugFactory from 'debug'
import type LoggingEvent from '../LoggingEvent'
import type { AppenderFunction } from '../types/core'
import type { RecordingAppender } from '../types/appenders'

const debug = debugFactory('log4js:recording')

const events: LoggingEvent[] = []

function configure (config: RecordingAppender): AppenderFunction {
  return function (logEvent: LoggingEvent): void {
    debug(`received logEvent, number of events now ${events.length + 1}`)
    debug('log event was', logEvent)

    if (config.maxLength && events.length >= config.maxLength) {
      events.shift()
    }
    events.push(logEvent)
  }
}

function shutdown (cb: (error?: Error) => void): void {
  events.length = 0
  cb()
}

export {
  configure,
  shutdown,
}

export function playback (): LoggingEvent[] {
  return events.slice()
}

export function reset (): void {
  events.length = 0
}

export function replay (): LoggingEvent[] {
  return events.slice()
}

export const erase = reset
