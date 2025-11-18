import type { Levels } from '../core/levels'
import type { Layouts } from '../core/layouts'
import type { LoggingEvent } from '../core/LoggingEvent'
import type { LayoutConfig } from '../types/layout'

/**
 * 所有适配器的 configure 函数都返回这个类型
 * @typeParam R - 是否带有 shutdown 方法
 * @description 有些 Appender 需要在关闭时执行一些清理工作，比如关闭文件句柄、网络连接等，这些 Appender 的函数会带有一个 shutdown 方法。
 */
export type AppenderFunction<R extends boolean = false> = R extends true
  ? ((loggingEvent: LoggingEvent) => void) & {
    /** 关闭 Appender 并执行清理工作 */
    shutdown: (complete: () => void) => void
  }
  : (loggingEvent: LoggingEvent) => void

/**
 * 查找 Appender 的函数类型
 */
export type FindAppenderFunction = (name: string) => AppenderFunction

/**
 * 适配器配置函数类型
 */
export type Configure<T, R extends boolean = false> = (
  /** 适配器配置对象 */
  config: T,
  /** 布局管理器 */
  layouts: Layouts,
  /** 查找 Appender 的函数 */
  findAppender: FindAppenderFunction,
  /** 级别管理器 */
  levels: Levels
) => AppenderFunction<R>

/**
 * 内部 Appender 类型枚举
 */
export enum AppenderTypes {
  /** 控制台输出 */
  Console = 'console',
  /** 标准输出 */
  Stdout = 'stdout',
  /** 标准错误输出 */
  Stderr = 'stderr',
  /** 文件输出 */
  File = 'file',
  /** 日期滚动文件输出 */
  DateFile = 'dateFile',
  /** 同步文件输出 */
  FileSync = 'fileSync',
  /** 日志级别过滤器 */
  LogLevelFilter = 'logLevelFilter',
  /** 分类过滤器 */
  CategoryFilter = 'categoryFilter',
  /** 无日志过滤器 */
  NoLogFilter = 'noLogFilter',
  /** 记录器 */
  Recording = 'recording',
  /** 多文件输出 */
  MultiFile = 'multiFile',
  /** 多进程输出 */
  Multiprocess = 'multiprocess',
  /** TCP 输出 */
  Tcp = 'tcp',
  /** TCP 服务器 */
  TcpServer = 'tcp-server',
}

export type AppenderType = `${AppenderTypes}`

/**
 * 内部 Appender 配置基础接口父类
 */
export interface AppenderConfigBase {
  /** Appender 类型 */
  type: AppenderType | `${AppenderType}`
  /** 布局配置 */
  layout?: LayoutConfig
}
