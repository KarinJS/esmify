// Appender type definitions compatible with original log4js

import type { Layout } from './layouts'

/**
 * Category Filter Appender
 *
 * @see https://log4js-node.github.io/log4js-node/categoryFilter.html
 */
export interface CategoryFilterAppender {
  type: 'categoryFilter'
  // the category (or categories if you provide an array of values) that will be excluded from the appender.
  exclude?: string | string[]
  // the name of the appender to filter. see https://log4js-node.github.io/log4js-node/layouts.html
  appender?: string
}

/**
 * No Log Filter Appender
 *
 * @see https://log4js-node.github.io/log4js-node/noLogFilter.html
 */
export interface NoLogFilterAppender {
  type: 'noLogFilter'
  // the regular expression (or the regular expressions if you provide an array of values)
  // will be used for evaluating the events to pass to the appender.
  // The events, which will match the regular expression, will be excluded and so not logged.
  exclude: string | string[]
  // the name of an appender, defined in the same configuration, that you want to filter.
  appender: string
}

/**
 * Console Appender
 *
 * @see https://log4js-node.github.io/log4js-node/console.html
 */
export interface ConsoleAppender {
  type: 'console'
  // (defaults to ColoredLayout)
  layout?: Layout
}

/**
 * File Appender
 *
 * @see https://log4js-node.github.io/log4js-node/file.html
 */
export interface FileAppender {
  type: 'file'
  // the path of the file where you want your logs written.
  filename: string
  // (defaults to undefined) the maximum size (in bytes) for the log file. If not specified or 0, then no log rolling will happen.
  maxLogSize?: number | string
  // (defaults to 5) the number of old log files to keep (excluding the hot file).
  backups?: number
  // (defaults to BasicLayout)
  layout?: Layout
  // (defaults to utf-8)
  encoding?: string
  // (defaults to 0o600)
  mode?: number
  // (defaults to a)
  flags?: string
  // (defaults to false) compress the backup files using gzip (backup files will have .gz extension)
  compress?: boolean
  // (defaults to false) preserve the file extension when rotating log files (`file.log` becomes `file.1.log` instead of `file.log.1`).
  keepFileExt?: boolean
  // (defaults to .) the filename separator when rolling. e.g.: abc.log`.`1 or abc`.`1.log (keepFileExt)
  fileNameSep?: string
  // (defaults to false) remove embedded ANSI color sequence
  removeColor?: boolean
}

/**
 * Sync File Appender
 *
 * @see https://log4js-node.github.io/log4js-node/fileSync.html
 */
export interface SyncfileAppender {
  type: 'fileSync'
  // the path of the file where you want your logs written.
  filename: string
  // (defaults to undefined) the maximum size (in bytes) for the log file. If not specified or 0, then no log rolling will happen.
  maxLogSize?: number | string
  // (defaults to 5) the number of old log files to keep (excluding the hot file).
  backups?: number
  // (defaults to BasicLayout)
  layout?: Layout
}

/**
 * Date File Appender
 *
 * @see https://log4js-node.github.io/log4js-node/dateFile.html
 */
export interface DateFileAppender {
  type: 'dateFile'
  // the path of the file where you want your logs written.
  filename: string
  // (defaults to yyyy-MM-dd) the pattern to use to determine when to roll the logs.
  pattern?: string
  // (defaults to BasicLayout)
  layout?: Layout
  // (defaults to utf-8)
  encoding?: string
  // (defaults to 0o600)
  mode?: number
  // (defaults to a)
  flags?: string
  // (defaults to false) compress the backup files using gzip (backup files will have .gz extension)
  compress?: boolean
  // (defaults to false) preserve the file extension when rotating log files
  keepFileExt?: boolean
  // (defaults to .) the filename separator when rolling
  fileNameSep?: string
  // (defaults to 1) the number of old files to keep
  numBackups?: number
  // (defaults to false) include the pattern in the name of the current log file
  alwaysIncludePattern?: boolean
}

/**
 * Log Level Filter Appender
 *
 * @see https://log4js-node.github.io/log4js-node/logLevelFilter.html
 */
export interface LogLevelFilterAppender {
  type: 'logLevelFilter'
  // the name of an appender, defined in the same configuration, that you want to filter
  appender: string
  // the minimum level of event to allow through the filter
  level: string
  // (defaults to FATAL) the maximum level of event to allow through the filter
  maxLevel?: string
}

/**
 * Multi File Appender
 *
 * @see https://log4js-node.github.io/log4js-node/multiFile.html
 */
export interface MultiFileAppender {
  type: 'multiFile'
  // the base part of the generated log filename
  base: string
  // the property to pick from the loggingEvent object for the variable part of the filename
  property: string
  // the suffix for the generated log filename (defaults to '')
  extension?: string
  // (defaults to BasicLayout)
  layout?: Layout
}

/**
 * Multiprocess Appender
 *
 * @see https://log4js-node.github.io/log4js-node/multiprocess.html
 */
export interface MultiprocessAppender {
  type: 'multiprocess'
  // controls whether the appender listens for log events sent over the network, or is responsible for serialising events and sending them to a server.
  mode: 'master' | 'worker'
  // (only needed if mode == master) the name of the appender to send the log events to
  appender?: string
  // (defaults to 5000) the port to listen on, or send to
  loggerPort?: number
  // (defaults to localhost) the host/IP address to listen on, or send to
  loggerHost?: string
}

/**
 * Recording Appender
 *
 * @see https://log4js-node.github.io/log4js-node/recording.html
 */
export interface RecordingAppender {
  type: 'recording'
}

/**
 * Standard Error Appender
 *
 * @see https://log4js-node.github.io/log4js-node/stderr.html
 */
export interface StandardErrorAppender {
  type: 'stderr'
  // (defaults to ColoredLayout)
  layout?: Layout
}

/**
 * Standard Output Appender
 *
 * @see https://log4js-node.github.io/log4js-node/stdout.html
 */
export interface StandardOutputAppender {
  type: 'stdout'
  // (defaults to ColoredLayout)
  layout?: Layout
}

/**
 * TCP Appender
 *
 * @see https://log4js-node.github.io/log4js-node/tcp.html
 */
export interface TCPAppender {
  type: 'tcp'
  // (defaults to 5000)
  port?: number
  // (defaults to localhost)
  host?: string
  // (defaults to __LOG4JS__)
  endMsg?: string
  // (defaults to BasicLayout)
  layout?: Layout
  // (defaults to utf-8)
  encoding?: string
}

/**
 * Custom Appender - for user-defined appenders
 */
export interface CustomAppender {
  type: string
  [key: string]: unknown
}

/**
 * Mapping of all Appenders to allow for declaration merging
 * @example
 * declare module '@karinjs/log4js' {
 *   interface Appenders {
 *     StorageTestAppender: {
 *       type: 'storageTest';
 *       storageMedium: 'dvd' | 'usb' | 'hdd';
 *     };
 *   }
 * }
 */
export interface Appenders {
  CategoryFilterAppender: CategoryFilterAppender
  NoLogFilterAppender: NoLogFilterAppender
  ConsoleAppender: ConsoleAppender
  FileAppender: FileAppender
  SyncfileAppender: SyncfileAppender
  DateFileAppender: DateFileAppender
  LogLevelFilterAppender: LogLevelFilterAppender
  MultiFileAppender: MultiFileAppender
  MultiprocessAppender: MultiprocessAppender
  RecordingAppender: RecordingAppender
  StandardErrorAppender: StandardErrorAppender
  StandardOutputAppender: StandardOutputAppender
  TCPAppender: TCPAppender
  CustomAppender: CustomAppender
}

export type Appender = Appenders[keyof Appenders]
