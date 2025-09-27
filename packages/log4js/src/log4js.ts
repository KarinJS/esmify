/**
 * @fileoverview log4js is a library to log in JavaScript in similar manner
 * than in log4j for Java (but not really).
 *
 * <h3>Example:</h3>
 * <pre>
 *  import log4js from 'log4js';
 *  const log = log4js.getLogger('some-category');
 *
 *  //call the log
 *  log.trace('trace me' );
 * </pre>
 *
 * NOTE: the authors below are the original browser-based log4js authors
 * don't try to contact them about bugs in this version :)
 * @author Stephan Strittmatter - http://jroller.com/page/stritti
 * @author Seth Chisamore - http://www.chisamore.com
 * @since 2005-05-20
 * Website: http://log4js.berlios.de
 */
import debugFactory from 'debug'
import { readFileSync } from 'node:fs'
import rfdc from 'rfdc'
import * as configuration from './configuration'
import * as layouts from './layouts'
import Level, { levels } from './levels'
import * as appenders from './appenders/index'
import * as categories from './categories'
import Logger from './logger'
import * as clustering from './clustering'
import connectLogger from './connect-logger'
import recordingModule from './appenders/recording'
import type { AppenderFunction, Configuration } from './types/core'
import type LoggingEvent from './LoggingEvent'

const debug = debugFactory('log4js:main')
const deepClone = rfdc({ proto: true })

let enabled = false

function sendLogEventToAppender (logEvent: LoggingEvent): void {
  if (!enabled) return
  debug('Received log event ', logEvent)
  const categoryAppenders = categories.appendersForCategory(
    logEvent.categoryName
  )
  categoryAppenders.forEach((appender: AppenderFunction) => {
    appender(logEvent)
  })
}

function loadConfigurationFile (filename: string): Configuration {
  debug(`Loading configuration from ${filename}`)
  try {
    return JSON.parse(readFileSync(filename, 'utf8'))
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    const error = new Error(
      `Problem reading config from file "${filename}". Error was ${errorMessage}`
    )
    // @ts-ignore - Error.cause is available in newer environments
    error.cause = e
    throw error
  }
}

function configure (configurationFileOrObject: string | Configuration): typeof log4js {
  if (enabled) {
    shutdown()
  }

  let configObject: Configuration = configurationFileOrObject as Configuration

  if (typeof configurationFileOrObject === 'string') {
    configObject = loadConfigurationFile(configurationFileOrObject) as Configuration
  }
  debug(`Configuration is ${configObject}`)

  configuration.configure(deepClone(configObject))

  clustering.onMessage(sendLogEventToAppender)

  enabled = true

  return log4js
}

function isConfigured (): boolean {
  return enabled
}

function recording (): typeof recordingModule {
  return recordingModule
}

/**
 * This callback type is called `shutdownCallback` and is displayed as a global symbol.
 *
 * @callback shutdownCallback
 * @param {Error} [error]
 */
type ShutdownCallback = (error?: Error) => void

/**
 * Shutdown all log appenders. This will first disable all writing to appenders
 * and then call the shutdown function each appender.
 *
 * @param callback - The callback to be invoked once all appenders have
 *  shutdown. If an error occurs, the callback will be given the error object
 *  as the first argument.
 */
function shutdown (callback: ShutdownCallback = () => { }): void {
  if (typeof callback !== 'function') {
    throw new TypeError('Invalid callback passed to shutdown')
  }
  debug('Shutdown called. Disabling all log writing.')
  // First, disable all writing to appenders. This prevents appenders from
  // not being able to be drained because of run-away log writes.
  enabled = false

  // Clone out to maintain a reference
  const appendersToCheck = Array.from(appenders.values())

  // Reset immediately to prevent leaks
  appenders.init()
  categories.init()

  // Count the number of shutdown functions
  const shutdownFunctions = appendersToCheck.reduce(
    (accum: number, next: AppenderFunction & { shutdown?: (callback: ShutdownCallback) => void }) => (next.shutdown ? accum + 1 : accum),
    0
  )
  if (shutdownFunctions === 0) {
    debug('No appenders with shutdown functions found.')
    callback()
    return
  }

  let completed = 0
  let error: Error | undefined
  debug(`Found ${shutdownFunctions} appenders with shutdown functions.`)
  function complete (err?: Error) {
    error = error || err
    completed += 1
    debug(`Appender shutdowns complete: ${completed} / ${shutdownFunctions}`)
    if (completed >= shutdownFunctions) {
      debug('All shutdown functions completed.')
      callback(error)
    }
  }

  // Call each of the shutdown functions
  appendersToCheck
    .filter((a: AppenderFunction & { shutdown?: (callback: ShutdownCallback) => void }) => a.shutdown)
    .forEach((a) => {
      const appenderWithShutdown = a as AppenderFunction & { shutdown: (callback: ShutdownCallback) => void }
      appenderWithShutdown.shutdown(complete)
    })
}

/**
 * Get a logger instance.
 * @static
 * @param category
 * @return instance of logger for the category
 */
function getLogger (category?: string): Logger {
  if (!enabled) {
    configure(
      process.env.LOG4JS_CONFIG || {
        appenders: { out: { type: 'stdout' } },
        categories: { default: { appenders: ['out'], level: 'OFF' } },
      }
    )
  }
  return new Logger(category || 'default')
}

/**
 * @name log4js
 * @namespace Log4js
 * @property getLogger
 * @property configure
 * @property shutdown
 */
const log4js = {
  getLogger,
  configure,
  isConfigured,
  shutdown,
  connectLogger,
  levels,
  addLayout: layouts.addLayout,
  recording,
}

// Named exports for ESM compatibility
export { getLogger, configure, isConfigured, shutdown, connectLogger, levels, recording }
export { layouts }
export { Level }
export { Logger }
export const addLayout = layouts.addLayout

// Export types for TypeScript - make levels compatible with the Levels interface
export type Levels = typeof levels
export type { Level as LevelType } from './levels'
export type { default as LoggerType } from './logger'
export type { default as LoggingEventType } from './LoggingEvent'

// Default export
export default log4js
