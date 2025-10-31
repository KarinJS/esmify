import streamroller from 'streamroller'
import type { DateRollingFileStream } from 'streamroller'
import { EOL } from 'node:os'
import type LoggingEvent from '../LoggingEvent'
import type { AppenderFunction, LayoutFunction, LayoutsParam } from '../types/core'
import type { DateFileAppender } from '../types/appenders'

const { DateRollingFileStream: DateRollingFileStreamClass } = streamroller

function openTheStream (filename: string, pattern: string, options: Record<string, unknown>): DateRollingFileStream {
  const stream = new DateRollingFileStreamClass(filename, pattern, options)
  stream.on('error', (err: Error) => {
    console.error(
      'log4js.dateFileAppender - Writing to file %s, error happened ',
      filename,
      err
    )
  })
  stream.on('drain', () => {
    // @ts-ignore - custom event
    process.emit('log4js:pause', false)
  })
  return stream
}

interface AppenderWithShutdown extends AppenderFunction {
  shutdown: (complete: () => void) => void
}

/**
 * File appender that rolls files according to a date pattern.
 * @param filename base filename.
 * @param pattern the format that will be added to the end of filename when rolling
 * @param layout layout function for log messages
 * @param options - options to be passed to the underlying stream
 * @param timezoneOffset - optional timezone offset in minutes
 */
function appender (
  filename: string,
  pattern: string,
  layout: LayoutFunction,
  options: DateFileAppender,
  timezoneOffset?: number
): AppenderWithShutdown {
  // the options for file appender use maxLogSize, but the docs say any file appender
  // options should work for dateFile as well.
  const opts = {
    ...options,
    maxSize: options.maxLogSize,
  }

  const writer = openTheStream(filename, pattern, opts)

  const app = function (logEvent: LoggingEvent): void {
    if (!writer.writable) {
      return
    }
    if (!writer.write(layout(logEvent, timezoneOffset) + EOL, 'utf8')) {
      // @ts-ignore - custom event
      process.emit('log4js:pause', true)
    }
  } as AppenderWithShutdown

  app.shutdown = function (complete: () => void): void {
    writer.end('', 'utf-8', complete)
  }

  return app
}

function configure (config: DateFileAppender, layouts: LayoutsParam): AppenderFunction {
  let layout = layouts.basicLayout
  if (config.layout) {
    layout = layouts.layout(config.layout.type, config.layout as Record<string, unknown>) || layout
  }

  const alwaysIncludePattern = config.alwaysIncludePattern ?? false
  const mode = config.mode ?? 0o600

  return appender(
    config.filename,
    config.pattern || 'yyyy-MM-dd',
    layout,
    { ...config, alwaysIncludePattern, mode },
    config.timezoneOffset
  )
}

export { configure }
