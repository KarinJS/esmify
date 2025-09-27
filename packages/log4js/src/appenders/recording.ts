import type LoggingEvent from '../LoggingEvent'
import type { AppenderFunction } from '../types/core'

const events: LoggingEvent[] = []

function configure (): AppenderFunction {
  return function (logEvent: LoggingEvent): void {
    events.push(logEvent)
  }
}

function shutdown (cb: (error?: Error) => void): void {
  events.length = 0
  cb()
}

export default {
  configure,
  shutdown,
  playback (): LoggingEvent[] {
    return events.slice()
  },
  reset (): void {
    events.length = 0
  },
  replay (): LoggingEvent[] {
    return events.slice()
  },
}
