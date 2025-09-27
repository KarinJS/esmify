import log4js from './log4js'

export default log4js
export const {
  getLogger,
  configure,
  isConfigured,
  shutdown,
  connectLogger,
  levels,
  addLayout,
  recording,
} = log4js

// Export types from our own implementations
export type { CallStack } from './logger'
export type { default as Level } from './levels'
export type { default as Logger } from './logger'
export type { default as LoggingEvent } from './LoggingEvent'
