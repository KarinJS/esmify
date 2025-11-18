/// <reference path="../types/date-format.d.ts" />

import { configuration } from './core/configuration'
import { log4js, Log4js } from './core/log4js'
import { layouts } from './core/layouts'

import type { } from '@/types/process'
import type { Levels } from '@/core/levels'

/* 兼容cjs导出 */
export { log4js, log4js as default }
export const getLogger = log4js.getLogger.bind(log4js)

/**
 * 配置 log4js（使用配置对象）
 * @param config - 配置对象
 * @returns log4js 实例
 */
export function configure<
  const T extends import('@/appenders').Config
> (config: T & import('@/appenders').Config<T['appenders']>): import('@/core/log4js').Log4js<T extends { levels: infer L extends import('@/core/levels').LevelConfig } ? L : undefined>
/**
 * 配置 log4js（使用配置文件路径）
 * @param configFilePath - 配置文件路径
 * @returns log4js 实例
 */
export function configure (configFilePath: string): import('@/core/log4js').Log4js<undefined>
/**
 * 配置 log4js 实现
 */
export function configure (config: any) {
  return log4js.configure(config)
}

/**
 * 类型安全的配置助手函数
 * @description 使用此函数可以获得更好的类型推断和约束
 * @param config - 配置对象
 * @returns 配置对象本身，但带有严格的类型约束
 * @example
 * ```ts
 * const logger = configure(defineConfig({
 *   appenders: {
 *     file: { type: 'file', filename: 'app.log' },
 *     console: { type: 'console' }
 *   },
 *   categories: {
 *     default: {
 *       appenders: ['file', 'console'], // 只能使用上面定义的 'file' 和 'console'
 *       level: 'info'
 *     }
 *   }
 * })).getLogger()
 * ```
 */
export const defineConfig = <
  const T extends import('@/appenders').Config
> (config: T & import('@/appenders').Config<T['appenders']>): T => config

export const isConfigured = Log4js.enabled
export const shutdown = log4js.shutdown.bind(log4js)
export const connectLogger = log4js.connectLogger.bind(log4js)
export const Level: Levels = log4js.levels
export const addLayout = log4js.addLayout.bind(log4js)
export const recording = log4js.recording

export { configuration }
export { Logger } from '@/core/logger'
export { layouts } from './core/layouts'
export { createLevel, LevelClass } from './core/levels'
export { connectLogger as connect } from './core/connect-logger'
export { LoggingEvent } from '@/core/LoggingEvent'
export { recording as recordingModule } from './appenders/recording'
export const {
  basicLayout,
  messagePassThroughLayout,
  patternLayout,
  colouredLayout,
  coloredLayout,
  dummyLayout,
} = layouts

export type { Log4js }
export type { LogLevel } from '@/appenders'
export type { LayoutMaker } from '@/core/layouts'
export type { Config } from '@/appenders/index'
export type { LevelConfig } from '@/core/levels'
export type { Colour } from '@/core/levels'
export type { CallStack } from '@/core/logger'

export type { Config as Configuration } from '@/appenders'
export type { TcpAppenderConfig } from '@/appenders/tcp'
export type { FileAppenderConfig } from '@/appenders/file'
export type { StdoutAppenderConfig } from '@/appenders/stdout'
export type { StderrAppenderConfig } from '@/appenders/stderr'
export type { ConsoleAppenderConfig } from '@/appenders/console'
export type { DateFileAppenderConfig } from '@/appenders/dateFile'
export type { FileSyncAppenderConfig } from '@/appenders/fileSync'
export type { RecordingAppenderConfig } from '@/appenders/recording'
export type { MultiFileAppenderConfig } from '@/appenders/multiFile'
export type { AppenderFunction, Configure } from '@/appenders/base'
export type { TcpServerAppenderConfig } from '@/appenders/tcp-server'
export type { NoLogFilterAppenderConfig } from '@/appenders/noLogFilter'
export type { MultiprocessAppenderConfig } from '@/appenders/multiprocess'
export type { LogLevelFilterAppenderConfig } from '@/appenders/logLevelFilter'
export type { CategoryFilterAppenderConfig } from '@/appenders/categoryFilter'
export type { FormatFunction, ConnectLoggerOptions } from '@/core/connect-logger'

export type * from '@/types/layout'
