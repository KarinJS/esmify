/* eslint no-underscore-dangle: ["error", { "allow": ["_log"] }] */

import debugFactory from 'debug'
import LoggingEvent from './LoggingEvent'
import Level from './levels'
import * as clustering from './clustering'
import * as categories from './categories'
import * as configuration from './configuration'
import type { ContextMap, LogData } from './types/core'

const debug = debugFactory('log4js:logger')

const stackReg = /^(?:\s*)at (?:(.+) \()?(?:([^(]+?):(\d+):(\d+))\)?$/

/**
 * The top entry is the Error
 */
const baseCallStackSkip = 1
/**
 * The _log function is 3 levels deep, we need to skip those to make it to the callSite
 */
const defaultErrorCallStackSkip = 3

export interface CallStack {
  fileName: string
  lineNumber: number
  columnNumber: number
  callStack: string
  className: string
  functionName: string
  functionAlias: string
  callerName: string
}

/**
 *
 * @param data
 * @param skipIdx
 * @returns CallStack | null
 */
function defaultParseCallStack (
  data: Error,
  skipIdx = defaultErrorCallStackSkip + baseCallStackSkip
): CallStack | null {
  try {
    const stacklines = data.stack?.split('\n').slice(skipIdx)
    if (!stacklines?.length) {
      // There's no stack in this stack
      // Should we try a previous index if skipIdx was set?
      return null
    }
    const lineMatch = stackReg.exec(stacklines[0])
    /* istanbul ignore else: failsafe */
    if (lineMatch && lineMatch.length === 5) {
      // extract class, function and alias names
      let className = ''
      let functionName = ''
      let functionAlias = ''
      if (lineMatch[1] && lineMatch[1] !== '') {
        // WARN: this will unset alias if alias is not present.
        ;[functionName, functionAlias] = lineMatch[1]
          .replace(/[[\]]/g, '')
          .split(' as ')
        functionAlias = functionAlias || ''

        if (functionName.includes('.')) { [className, functionName] = functionName.split('.') }
      }

      return {
        fileName: lineMatch[2],
        lineNumber: parseInt(lineMatch[3], 10),
        columnNumber: parseInt(lineMatch[4], 10),
        callStack: stacklines.join('\n'),
        className,
        functionName,
        functionAlias,
        callerName: lineMatch[1] || '',
      }
    } else {
      // will never get here unless nodejs has changes to Error
      console.error('log4js.logger - defaultParseCallStack error')
    }
  } catch (err) {
    // will never get error unless nodejs has breaking changes to Error
    console.error('log4js.logger - defaultParseCallStack error', err)
  }
  return null
}

/**
 * Logger to log messages.
 * use {@see log4js#getLogger(String)} to get an instance.
 *
 * @name Logger
 * @namespace Log4js
 * @param name name of category to log to
 * @param level - the loglevel for the category
 * @param dispatch - the function which will receive the logevents
 *
 * @author Stephan Strittmatter
 */
class Logger {
  category: string
  context: ContextMap
  private callStackSkipIndex: number
  private parseCallStack: (data: Error, skipIdx?: number) => CallStack | null

  constructor (name: string) {
    if (!name) {
      throw new Error('No category provided.')
    }
    this.category = name
    this.context = {}
    this.callStackSkipIndex = 0
    this.parseCallStack = defaultParseCallStack
    debug(`Logger created (${this.category}, ${this.level})`)
  }

  get level (): Level {
    return Level.getLevel(
      categories.getLevelForCategory(this.category),
      Level.getLevel('OFF')!
    )!
  }

  set level (level: Level | string) {
    categories.setLevelForCategory(
      this.category,
      Level.getLevel(level, this.level)!
    )
  }

  get useCallStack (): boolean {
    return categories.getEnableCallStackForCategory(this.category)
  }

  set useCallStack (bool: boolean) {
    categories.setEnableCallStackForCategory(this.category, bool === true)
  }

  get callStackLinesToSkip (): number {
    return this.callStackSkipIndex
  }

  set callStackLinesToSkip (number: number) {
    if (typeof number !== 'number') {
      throw new TypeError('Must be a number')
    }
    if (number < 0) {
      throw new RangeError('Must be >= 0')
    }
    this.callStackSkipIndex = number
  }

  log (level: Level | string, ...args: LogData): void {
    const logLevel = Level.getLevel(level)
    if (!logLevel) {
      if (configuration.validIdentifier(level) && args.length > 0) {
        // logLevel not found but of valid signature, WARN before fallback to INFO
        this.log(
          Level.getLevel('WARN')!,
          'log4js:logger.log: valid log-level not found as first parameter given:',
          level
        )
        this.log(Level.getLevel('INFO')!, `[${level}]`, ...args)
      } else {
        // apart from fallback, allow .log(...args) to be synonym with .log("INFO", ...args)
        this.log(Level.getLevel('INFO')!, level, ...args)
      }
    } else if (this.isLevelEnabled(logLevel)) {
      this._log(logLevel, args)
    }
  }

  isLevelEnabled (otherLevel: Level): boolean {
    return this.level.isLessThanOrEqualTo(otherLevel)
  }

  _log (level: Level, data: LogData): void {
    debug(`sending log data (${level}) to appenders`)
    const error = data.find((item) => item instanceof Error)
    let callStack: CallStack | null | undefined
    if (this.useCallStack) {
      try {
        if (error) {
          callStack = this.parseCallStack(
            error,
            this.callStackSkipIndex + baseCallStackSkip
          )
        }
      } catch (_err) {
        // Ignore Error and use the original method of creating a new Error.
      }
      callStack =
        callStack ||
        this.parseCallStack(
          new Error(),
          this.callStackSkipIndex +
          defaultErrorCallStackSkip +
          baseCallStackSkip
        )
    }
    const loggingEvent = new LoggingEvent(
      this.category,
      level,
      data,
      this.context,
      callStack,
      error
    )
    clustering.send(loggingEvent)
  }

  addContext (key: string, value: unknown): void {
    this.context[key] = value
  }

  removeContext (key: string): void {
    delete this.context[key]
  }

  clearContext (): void {
    this.context = {}
  }

  setParseCallStackFunction (parseFunction?: (data: Error, skipIdx?: number) => CallStack | null): void {
    if (typeof parseFunction === 'function') {
      this.parseCallStack = parseFunction
    } else if (typeof parseFunction === 'undefined') {
      this.parseCallStack = defaultParseCallStack
    } else {
      throw new TypeError('Invalid type passed to setParseCallStackFunction')
    }
  }
}

// Augment Logger interface with dynamically added methods
interface Logger {
  // Standard level check methods
  isTraceEnabled (): boolean
  isDebugEnabled (): boolean
  isInfoEnabled (): boolean
  isWarnEnabled (): boolean
  isErrorEnabled (): boolean
  isFatalEnabled (): boolean
  isMarkEnabled (): boolean

  // Standard logging methods
  trace (message: unknown, ...args: LogData): void
  debug (message: unknown, ...args: LogData): void
  info (message: unknown, ...args: LogData): void
  warn (message: unknown, ...args: LogData): void
  error (message: unknown, ...args: LogData): void
  fatal (message: unknown, ...args: LogData): void
  mark (message: unknown, ...args: LogData): void

  // Support for custom levels added dynamically
  // Pattern: is{LevelName}Enabled() and {levelName}(message, ...args)
  [key: string]: any
}

export default Logger

function addLevelMethods (target: string): void {
  const level = Level.getLevel(target)
  if (!level) return

  const levelStrLower = level.toString().toLowerCase()
  const levelMethod = levelStrLower.replace(/_([a-z])/g, (g) =>
    g[1].toUpperCase()
  )
  const isLevelMethod = levelMethod[0].toUpperCase() + levelMethod.slice(1);
  (Logger.prototype as unknown as Record<string, unknown>)[`is${isLevelMethod}Enabled`] = function (this: Logger) { return this.isLevelEnabled(level) };
  (Logger.prototype as unknown as Record<string, unknown>)[levelMethod] = function (this: Logger, ...args: LogData) { this.log(level, ...args) }
}

Level.levels.forEach((level) => addLevelMethods(level.levelStr))

configuration.addListener(() => {
  Level.levels.forEach((level) => addLevelMethods(level.levelStr))
})
