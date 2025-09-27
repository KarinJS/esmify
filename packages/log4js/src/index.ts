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

// Export all core types
export type {
  AppenderFunction,
  LayoutFunction,
  AppenderModule,
  LayoutsParam,
  PatternToken,
  AppenderConfig,
  CategoryConfig,
  Configuration,
  Levels,
  LogData,
  ContextMap,
  Serializable,
  Token as CoreToken,
  HttpRequest,
  HttpResponse,
  ClusterMessage,
  CallStack as CoreCallStack,
} from './types/core'

// Export layout types
export type {
  Token,
  BasicLayout,
  ColoredLayout,
  MessagePassThroughLayout,
  DummyLayout,
  PatternLayout,
  CustomLayout,
  Layout,
} from './types/layouts'

// Export appender types
export type {
  CategoryFilterAppender,
  NoLogFilterAppender,
  ConsoleAppender,
  FileAppender,
  SyncfileAppender,
  DateFileAppender,
  LogLevelFilterAppender,
  MultiFileAppender,
  MultiprocessAppender,
  RecordingAppender,
  StandardErrorAppender,
  StandardOutputAppender,
  TCPAppender,
  CustomAppender,
  Appenders,
  Appender,
} from './types/appenders'

// Export recording and main interface types
export type {
  Recording,
  Format,
  Log4js,
} from './types/recording'
