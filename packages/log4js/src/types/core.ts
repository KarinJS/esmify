// Core type definitions for log4js

import type LoggingEvent from '../LoggingEvent'
import type Level from '../levels'

// Appender related types
export type AppenderFunction = (logEvent: LoggingEvent) => void

export type LayoutFunction = (logEvent: LoggingEvent, timezoneOffset?: number) => string

// Re-export and enhance official types for internal use
export interface AppenderModule {
  configure: (...args: unknown[]) => AppenderFunction
}

export interface LayoutsParam {
  basicLayout: LayoutFunction
  messagePassThroughLayout: LayoutFunction
  patternLayout: LayoutFunction
  colouredLayout: LayoutFunction
  coloredLayout: LayoutFunction
  dummyLayout: LayoutFunction
  addLayout: (name: string, serializerGenerator: LayoutFunction) => void
  layout: (name: string, config?: Record<string, unknown>) => LayoutFunction | undefined
}

export interface PatternToken {
  pattern?: string
  tokens?: { [tokenName: string]: () => unknown }
  type?: string
  [key: string]: unknown
}

// Configuration types based on official definitions
export interface AppenderConfig {
  type: string
  [key: string]: unknown
}

export interface CategoryConfig {
  appenders: string[]
  level: string
  enableCallStack?: boolean
  inherit?: boolean
  parent?: CategoryConfig
}

export interface Configuration {
  appenders: { [name: string]: AppenderConfig }
  categories: {
    [name: string]: CategoryConfig
  }
  pm2?: boolean
  pm2InstanceVar?: string
  levels?: {
    [name: string]: {
      value: number
      colour: string
    }
  }
  disableClustering?: boolean
}

export interface Levels {
  ALL: Level
  MARK: Level
  TRACE: Level
  DEBUG: Level
  INFO: Level
  WARN: Level
  ERROR: Level
  FATAL: Level
  OFF: Level
  levels: Level[]
  getLevel (level: Level | string, defaultLevel?: Level): Level | undefined
  addLevels (customLevels: Record<string, { value: number; colour: string }>): void
}

// Utility types
export type LogData = unknown[]
export type ContextMap = Record<string, unknown>
export type Serializable = string | number | boolean | null | undefined | Serializable[] | { [key: string]: Serializable }

// Token and formatting types
export interface Token {
  token: string | RegExp
  replacement: string | ((loggingEvent: LoggingEvent, specifier?: string) => string)
}

// HTTP request/response types for connect-logger
export interface HttpRequest {
  method?: string
  url?: string
  originalUrl?: string
  protocol?: string
  hostname?: string
  httpVersionMajor?: number
  httpVersionMinor?: number
  headers?: Record<string, string | string[] | undefined>
  connection?: {
    remoteAddress?: string
  }
  socket?: {
    remoteAddress?: string
    socket?: {
      remoteAddress?: string
    }
  }
  ip?: string
  _remoteAddress?: string
  _logging?: boolean
  [key: string]: unknown
}

export interface HttpResponse {
  statusCode?: number
  statusMessage?: string
  responseTime?: number
  __statusCode?: number
  __headers?: Record<string, string | string[] | number>
  getHeader?: (name: string) => string | string[] | number | undefined
  writeHead?: (statusCode: number, headers?: Record<string, string | string[] | number>) => HttpResponse
  on?: (event: string, handler: () => void) => void
  [key: string]: unknown
}

// Cluster message types
export interface ClusterMessage {
  topic: string
  data: LoggingEvent
}

// Error with stack trace
export interface CallStack {
  fileName?: string
  lineNumber?: number
  columnNumber?: number
  functionName?: string
  source?: string
  [key: string]: unknown
}
