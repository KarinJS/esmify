import util from 'util'
import debugModule from 'debug'
import { levels } from '../core/levels'
import { layouts } from '../core/layouts'
import { AppenderType } from './base'
import { clustering } from '../core/clustering'
import { modifyConfig } from './adapters'
import { configuration } from '../core/configuration'
import { configure as configureTcp } from './tcp'
import { configure as configureFile } from './file'
import { configure as configureStdout } from './stdout'
import { configure as configureStderr } from './stderr'
import { configure as configureConsole } from './console'
import { configure as configureDateFile } from './dateFile'
import { configure as configureFileSync } from './fileSync'
import { configure as configureRecording } from './recording'
import { configure as configureMultiFile } from './multiFile'
import { configure as configureTcpServer } from './tcp-server'
import { configure as configureNoLogFilter } from './noLogFilter'
import { configure as configureMultiprocess } from './multiprocess'
import { configure as configureLogLevelFilter } from './logLevelFilter'
import { configure as configureCategoryFilter } from './categoryFilter'

import type { Colour } from '../core/levels'
import type { TcpAppenderConfig } from './tcp'
import type { FileAppenderConfig } from './file'
import type { StdoutAppenderConfig } from './stdout'
import type { StderrAppenderConfig } from './stderr'
import type { ConsoleAppenderConfig } from './console'
import type { DateFileAppenderConfig } from './dateFile'
import type { FileSyncAppenderConfig } from './fileSync'
import type { RecordingAppenderConfig } from './recording'
import type { MultiFileAppenderConfig } from './multiFile'
import type { AppenderFunction, Configure } from './base'
import type { TcpServerAppenderConfig } from './tcp-server'
import type { NoLogFilterAppenderConfig } from './noLogFilter'
import type { MultiprocessAppenderConfig } from './multiprocess'
import type { LogLevelFilterAppenderConfig } from './logLevelFilter'
import type { CategoryFilterAppenderConfig } from './categoryFilter'

const debug = debugModule('log4js:appenders')

/**
 * 日志级别类型
 */
export type LogLevel = 'all' | 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'mark' | 'off'

/**
 * 所有内部 Appender 配置接口
 */
export interface InternalConfigAppenders {
  console?: ConsoleAppenderConfig
  stdout?: StdoutAppenderConfig
  stderr?: StderrAppenderConfig
  file?: FileAppenderConfig
  dateFile?: DateFileAppenderConfig
  fileSync?: FileSyncAppenderConfig
  logLevelFilter?: LogLevelFilterAppenderConfig
  categoryFilter?: CategoryFilterAppenderConfig
  noLogFilter?: NoLogFilterAppenderConfig
  recording?: RecordingAppenderConfig
  multiFile?: MultiFileAppenderConfig
  multiprocess?: MultiprocessAppenderConfig
  tcp?: TcpAppenderConfig
  'tcp-server'?: TcpServerAppenderConfig
}

export interface CustomConfigure {
  /**
   * Appender 类型
   * @example
   * ```ts
   * type: 'console'
   * ```
   * 或自定义配置函数
   * ```ts
   * {
   *   type: {
   *     configure: Configure
   *   } // 自定义 Appender 配置函数
   * }
   * ```
   */
  type: { configure: Configure<any> }
}

/**
 * Appenders 配置值类型
 * @description 包含了所有内部 Appender 配置和自定义配置
 */
export type ConfigAppendersValue =
  | ConsoleAppenderConfig
  | StdoutAppenderConfig
  | StderrAppenderConfig
  | FileAppenderConfig
  | DateFileAppenderConfig
  | FileSyncAppenderConfig
  | LogLevelFilterAppenderConfig
  | CategoryFilterAppenderConfig
  | NoLogFilterAppenderConfig
  | RecordingAppenderConfig
  | MultiFileAppenderConfig
  | MultiprocessAppenderConfig
  | TcpAppenderConfig
  | TcpServerAppenderConfig
  | CustomConfigure

/**
 * Appenders 配置类型
 * @description 允许任意 string key，但 value 必须是指定的 appender 配置类型之一
 */
export type ConfigAppenders = {
  [key: string]: ConfigAppendersValue
}

/**
 * 配置接口（带泛型约束）
 * @template TAppenders - Appenders 配置对象类型
 * @description 通过泛型自动推断 appender keys，确保 categories 中只能引用已定义的 appender
 */
export interface Config<
  TAppenders extends Record<string, ConfigAppendersValue> = Record<string, ConfigAppendersValue>
> {
  /** Appenders 配置对象 */
  appenders: TAppenders
  /** 分类配置对象 */
  categories: Record<string, CategoryConfig<Extract<keyof TAppenders, string>>> & {
    default: CategoryConfig<Extract<keyof TAppenders, string>> // 必须有 default 分类
  }
  /** pm2是否启用 */
  pm2?: boolean
  /** pm2 环境变量名称 */
  pm2InstanceVar?: string
  /** 自定义日志级别配置 */
  levels?: Record<string, {
    /**
     * 级别值
     * @description 值越大，级别越高
     * - all: Number.MIN_VALUE
     * - trace: 5000
     * - debug: 10000
     * - info: 20000
     * - warn: 30000
     * - error: 40000
     * - fatal: 50000
     * - mark: 9007199254740992 // 2^53
     * - off: Number.MAX_VALUE
     */
    value: number
    /** 级别颜色 */
    colour: Colour
  }>
  /** 是否禁用集群功能 */
  disableClustering?: boolean
}

/**
 * 严格的配置类型 - 用于类型检查
 * @description 这个类型会严格约束 categories.appenders 必须引用已定义的 appender key
 * @deprecated 使用 Config<T> 即可，无需使用此类型
 */
export type StrictConfig<T extends Record<string, ConfigAppendersValue>> = Config<T>

/**
 * 分类配置接口
 */
export interface CategoryConfig<T> {
  /**
   * 使用的 appender 名称列表
   * @description 至少需要一个 appender
   */
  appenders: [T, ...T[]]
  /** 日志级别 */
  level: LogLevel
  /** 是否启用调用栈 */
  enableCallStack?: boolean
  /** 是否继承父分类配置 */
  inherit?: boolean
  /** 父分类配置 */
  parent?: CategoryConfig<T>
}

/** 正在加载的 Appenders 集合，用于检测循环依赖 */
const appendersLoading = new Set<string>()
/** 已加载的 Appenders 集合 */
const appenders = new Map<string, AppenderFunction<true> | AppenderFunction<false>>()

/**
 * 加载 Appender 模块
 * @param type - Appender 类型
 * @param config - 配置对象
 * @returns 加载的 Appender 模块或 undefined
 */
const loadAppenderModule = (type: AppenderType): { configure: Configure<any, any> } => {
  switch (type) {
    case 'console': return { configure: configureConsole }
    case 'stdout': return { configure: configureStdout }
    case 'stderr': return { configure: configureStderr }
    case 'file': return { configure: configureFile }
    case 'dateFile': return { configure: configureDateFile }
    case 'fileSync': return { configure: configureFileSync }
    case 'logLevelFilter': return { configure: configureLogLevelFilter }
    case 'categoryFilter': return { configure: configureCategoryFilter }
    case 'noLogFilter': return { configure: configureNoLogFilter }
    case 'recording': return { configure: configureRecording }
    case 'multiFile': return { configure: configureMultiFile }
    case 'multiprocess': return { configure: configureMultiprocess }
    case 'tcp': return { configure: configureTcp }
    case 'tcp-server': return { configure: configureTcpServer }
    default: throw new Error(`未知的 Appender 类型: ${type}`)
  }
}

/**
 * 获取 Appender
 * @param name - Appender 名称
 * @param config - 配置对象
 * @returns Appender 函数或 false
 */
const getAppender = (name: AppenderType, config: Config): AppenderFunction => {
  if (appenders.has(name)) return appenders.get(name)!
  if (!config.appenders[name]) {
    throw new Error(`appender "${name}" not found`)
  }
  if (appendersLoading.has(name)) { throw new Error(`检测到 appender ${name} 的依赖循环。`) }
  appendersLoading.add(name)

  debug(`正在创建 appender ${name}`)
  const appender = createAppender(name, config)
  appendersLoading.delete(name)
  appenders.set(name, appender)
  return appender
}

const getAppenderModule = (
  appenderConfig: ConfigAppendersValue
) => {
  if (typeof appenderConfig?.type === 'object' && 'configure' in appenderConfig.type) {
    return appenderConfig.type
  }

  if (typeof appenderConfig?.type !== 'string') {
    throw new Error(`appender type must be a string or a configure object, got ${typeof appenderConfig?.type}`)
  }
  return loadAppenderModule(appenderConfig.type as AppenderType)
}

/**
 * 创建 Appender
 * @param name - Appender 名称
 * @param config - 配置对象
 * @returns Appender 函数
 */
const createAppender = (name: AppenderType, config: Config) => {
  const appenderConfig = config.appenders[name]
  if (!appenderConfig) {
    throw new Error(`appender "${name}" not found`)
  }
  const appenderModule = getAppenderModule(appenderConfig)
  configuration.throwExceptionIf(
    config,
    configuration.not(appenderModule),
    `appender "${name}" 无效（类型 "${appenderConfig?.type}" 未找到）`
  )

  debug(`${name}: clustering.isMaster ? ${clustering.isMaster()}`)
  debug(
    `${name}: appenderModule 是 ${util.inspect(appenderModule)}`
  )
  return clustering.onlyOnMaster(
    () => {
      debug(
        `为 ${name} / ${appenderConfig?.type} 调用 appenderModule.configure`
      )
      return appenderModule.configure(
        modifyConfig(appenderConfig),
        layouts,
        (appender: string) => getAppender(appender as AppenderType, config),
        levels
      )
    },
    () => {
      throw new Error('istanbul ignore next: fn never gets called by non-master yet needed to pass config validation')
    }
  )
}

/**
 * 设置 Appenders
 * @param config - 配置对象
 */
const setup = (config?: Config) => {
  appenders.clear()
  appendersLoading.clear()
  if (!config) {
    return
  }

  /** 全部使用的 Appenders 列表 */
  const usedAppenders = Object.values(config.categories).map(category => category.appenders).flat()
  Object.keys(config.appenders).forEach((name: string) => {
    // 对 tcp-server 和 multiprocess 的特殊情况进行硬编码处理
    // 它们可能没有关联的分类，但仍需要启动
    if (
      usedAppenders.includes(name as AppenderType) ||
      config.appenders[name as AppenderType]?.type === 'tcp-server' ||
      config.appenders[name as AppenderType]?.type === 'multiprocess'
    ) {
      getAppender(name as AppenderType, config)
    }
  })
}

/**
 * 初始化 Appenders
 */
const init = () => setup()
init()

configuration.addListener((config: Config) => {
  configuration.throwExceptionIf(
    config,
    configuration.not(configuration.anObject(config.appenders)),
    '必须有一个类型为 object 的属性 "appenders"。'
  )
  const appenderNames = Object.keys(config.appenders)
  configuration.throwExceptionIf(
    config,
    configuration.not(appenderNames.length),
    '必须至少定义一个 appender。'
  )

  appenderNames.forEach((name) => {
    configuration.throwExceptionIf(
      config,
      configuration.not(config.appenders[name as AppenderType]?.type),
      `appender "${name}" 无效（必须是具有 "type" 属性的对象）`
    )
  })
})

configuration.addListener(setup)

export { init, appenders }
export default Object.assign(appenders, { init })
