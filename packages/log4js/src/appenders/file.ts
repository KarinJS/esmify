import debugFactory from 'debug'
import { normalize, sep } from 'node:path'
import streamroller from 'streamroller'
import type { RollingFileStream } from 'streamroller'
import { homedir, EOL } from 'node:os'
import type LoggingEvent from '../LoggingEvent'
import type { AppenderFunction, LayoutFunction, LayoutsParam } from '../types/core'
import type { FileAppender } from '../types/appenders'

const { RollingFileStream: RollingFileStreamClass } = streamroller

const debug = debugFactory('log4js:file')

let mainSighupListenerStarted = false
const sighupListeners = new Set<AppenderFunctionWithExtras>()

function mainSighupHandler (): void {
  sighupListeners.forEach((app) => {
    app.sighupHandler()
  })
}

interface AppenderFunctionWithExtras extends AppenderFunction {
  reopen: () => void
  sighupHandler: () => void
  shutdown: (complete: () => void) => void
}

/**
 * File Appender writing the logs to a text file. Supports rolling of logs by size.
 *
 * @param file the file log messages will be written to
 * @param layout a function that takes a logEvent and returns a string
 * @param logSize - the maximum size (in bytes) for a log file
 * @param numBackups - the number of log files to keep after logSize has been reached
 * @param options - options to be passed to the underlying stream
 * @param timezoneOffset - optional timezone offset in minutes
 */
function fileAppender (
  file: string,
  layout: LayoutFunction,
  logSize?: number | string,
  numBackups?: number,
  options?: Record<string, unknown>,
  timezoneOffset?: number
): AppenderFunctionWithExtras {
  if (typeof file !== 'string' || file.length === 0) {
    throw new Error(`Invalid filename: ${file}`)
  }
  if (file.endsWith(sep)) {
    throw new Error(`Filename is a directory: ${file}`)
  }
  if (file.indexOf(`~${sep}`) === 0) {
    // handle ~ expansion: https://github.com/nodejs/node/issues/684
    // exclude ~ and ~filename as these can be valid files
    file = file.replace('~', homedir())
  }

  file = normalize(file)
  numBackups = !numBackups && numBackups !== 0 ? 5 : numBackups

  debug(
    'Creating file appender (',
    file,
    ', ',
    logSize,
    ', ',
    numBackups,
    ', ',
    options,
    ', ',
    timezoneOffset,
    ')'
  )

  function openTheStream (
    filePath: string,
    fileSize?: number | string,
    numFiles?: number,
    opt?: Record<string, unknown>
  ): RollingFileStream {
    const stream = new RollingFileStreamClass(
      filePath,
      fileSize,
      numFiles,
      opt
    )
    stream.on('error', (err: Error) => {
      console.error(
        'log4js.fileAppender - Writing to file %s, error happened ',
        filePath,
        err
      )
    })
    stream.on('drain', () => {
      // @ts-ignore - custom event
      process.emit('log4js:pause', false)
    })
    return stream
  }

  let writer = openTheStream(file, logSize, numBackups, options)

  const app = function (loggingEvent: LoggingEvent): void {
    if (!writer.writable) {
      return
    }
    if (options?.removeColor === true) {
      // Remove ANSI color codes
      const regex = /\x1b\[[0-9;]*m/g
      loggingEvent.data = loggingEvent.data.map((d) => {
        if (typeof d === 'string') return d.replace(regex, '')
        return d
      })
    }
    if (!writer.write(layout(loggingEvent, timezoneOffset) + EOL, 'utf8')) {
      // @ts-ignore - custom event
      process.emit('log4js:pause', true)
    }
  } as AppenderFunctionWithExtras

  app.reopen = function (): void {
    writer.end(() => {
      writer = openTheStream(file, logSize, numBackups, options)
    })
  }

  app.sighupHandler = function (): void {
    debug('SIGHUP handler called.')
    app.reopen()
  }

  app.shutdown = function (complete: () => void): void {
    sighupListeners.delete(app)
    if (sighupListeners.size === 0 && mainSighupListenerStarted) {
      process.removeListener('SIGHUP', mainSighupHandler)
      mainSighupListenerStarted = false
    }
    writer.end('', 'utf-8', complete)
  }

  // On SIGHUP, close and reopen all files. This allows this appender to work with
  // logrotate. Note that if you are using logrotate, you should not set `logSize`.
  sighupListeners.add(app)
  if (!mainSighupListenerStarted) {
    process.on('SIGHUP', mainSighupHandler)
    mainSighupListenerStarted = true
  }

  return app
}

function configure (config: FileAppender, layouts: LayoutsParam): AppenderFunction {
  let layout = layouts.basicLayout
  if (config.layout) {
    layout = layouts.layout(config.layout.type, config.layout as Record<string, unknown>) || layout
  }

  // security default (instead of relying on streamroller default)
  const mode = config.mode ?? 0o600

  return fileAppender(
    config.filename,
    layout,
    config.maxLogSize,
    config.backups,
    { ...config, mode } as Record<string, unknown>,
    config.timezoneOffset
  )
}

export { configure }
