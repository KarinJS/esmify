/* eslint max-classes-per-file: ["error", 2] */
/* eslint no-underscore-dangle: ["error", { "allow": ["_getLocationKeys"] }] */

import { stringify, parse } from 'flatted'
import Level from './levels'
import type { CallStack } from './logger'
import type { LogData, ContextMap } from './types/core'

class SerDe {
  deMap: Record<string, unknown>
  serMap: Map<unknown, string>

  constructor () {
    const deserialise = {
      __LOG4JS_undefined__: undefined,
      __LOG4JS_NaN__: Number('abc'),
      __LOG4JS_Infinity__: 1 / 0,
      '__LOG4JS_-Infinity__': -1 / 0,
    }
    this.deMap = deserialise
    this.serMap = new Map()
    Object.keys(this.deMap).forEach((key) => {
      const value = this.deMap[key]
      this.serMap.set(value, key)
    })
  }

  canSerialise (key: unknown): boolean {
    if (typeof key === 'string') return false
    try {
      return this.serMap.has(key)
    } catch (e) {
      return false
    }
  }

  serialise (key: unknown): unknown {
    if (this.canSerialise(key)) return this.serMap.get(key)
    return key
  }

  canDeserialise (key: unknown): boolean {
    return typeof key === 'string' && key in this.deMap
  }

  deserialise (key: unknown): unknown {
    if (this.canDeserialise(key)) return this.deMap[key as string]
    return key
  }
}
const serde = new SerDe()

/**
 * @name LoggingEvent
 * @namespace Log4js
 */
export default class LoggingEvent {
  startTime: Date
  categoryName: string
  data: LogData
  level: Level
  context: ContextMap
  pid: number
  error?: Error
  fileName?: string
  lineNumber?: number
  columnNumber?: number
  callStack?: string
  className?: string
  functionName?: string
  functionAlias?: string
  callerName?: string
  cluster?: unknown

  /**
   * Models a logging event.
   * @constructor
   * @param categoryName name of category
   * @param level level of message
   * @param data objects to log
   * @param error
   * @author Seth Chisamore
   */
  constructor (categoryName: string, level: Level, data: LogData, context?: ContextMap, location?: CallStack | null, error?: Error) {
    this.startTime = new Date()
    this.categoryName = categoryName
    this.data = data
    this.level = level
    this.context = Object.assign({}, context)
    this.pid = process.pid
    this.error = error

    if (typeof location !== 'undefined') {
      if (!location || typeof location !== 'object' || Array.isArray(location)) {
        throw new TypeError(
          'Invalid location type passed to LoggingEvent constructor'
        )
      }

      LoggingEvent._getLocationKeys().forEach((key) => {
        const locationValue = (location as unknown as Record<string, unknown>)[key]
        if (typeof locationValue !== 'undefined') {
          (this as unknown as Record<string, unknown>)[key] = locationValue
        }
      })
    }
  }

  /** @private */
  static _getLocationKeys (): string[] {
    return [
      'fileName',
      'lineNumber',
      'columnNumber',
      'callStack',
      'className',
      'functionName',
      'functionAlias',
      'callerName',
    ]
  }

  serialise (): string {
    return stringify(this, (_key, value) => {
      // JSON.stringify(new Error('test')) returns {}, which is not really useful for us.
      // The following allows us to serialize errors (semi) correctly.
      if (value instanceof Error) {
        value = Object.assign(
          { message: value.message, stack: value.stack },
          value
        )
      }
      // JSON.stringify({a: Number('abc'), b: 1/0, c: -1/0}) returns {a: null, b: null, c: null}.
      // The following allows us to serialize to NaN, Infinity and -Infinity correctly.
      // JSON.stringify([undefined]) returns [null].
      // The following allows us to serialize to undefined correctly.
      return serde.serialise(value)
    })
  }

  static deserialise (serialised: string): LoggingEvent {
    let event: LoggingEvent
    try {
      const rehydratedEvent = parse(serialised, (_key, value) => {
        if (value && value.message && value.stack) {
          const fakeError = new Error(value.message || '')
          Object.keys(value).forEach((k) => {
            ; (fakeError as unknown as Record<string, unknown>)[k] = value[k]
          })
          value = fakeError
        }
        return serde.deserialise(value)
      })
      LoggingEvent._getLocationKeys().forEach((key) => {
        const eventValue = (rehydratedEvent as Record<string, unknown>)[key]
        if (typeof eventValue !== 'undefined') {
          if (!rehydratedEvent.location) rehydratedEvent.location = {}; (rehydratedEvent.location as Record<string, unknown>)[key] = eventValue
        }
      })
      event = new LoggingEvent(
        rehydratedEvent.categoryName,
        Level.getLevel(rehydratedEvent.level.levelStr)!,
        rehydratedEvent.data,
        rehydratedEvent.context,
        rehydratedEvent.location,
        rehydratedEvent.error
      )
      event.startTime = new Date(rehydratedEvent.startTime)
      event.pid = rehydratedEvent.pid
      if (rehydratedEvent.cluster) {
        event.cluster = rehydratedEvent.cluster
      }
    } catch (e) {
      event = new LoggingEvent('log4js', Level.getLevel('ERROR')!, [
        'Unable to parse log:',
        serialised,
        'because: ',
        e,
      ])
    }

    return event
  }
}
