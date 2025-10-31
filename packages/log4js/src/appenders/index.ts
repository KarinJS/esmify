import { resolve, join, dirname } from 'node:path'
import debugFactory from 'debug'
import * as configuration from '../configuration'
import * as clustering from '../clustering'
import Level from '../levels'
import * as layouts from '../layouts'
import * as adapters from './adapters'
import * as stdout from './stdout'
import * as stderr from './stderr'
import * as console from './console'
import * as file from './file'
import * as dateFile from './dateFile'
import * as fileSync from './fileSync'
import * as tcp from './tcp'
import * as tcpServer from './tcp-server'
import * as logLevelFilter from './logLevelFilter'
import * as categoryFilter from './categoryFilter'
import * as noLogFilter from './noLogFilter'
import * as multiFile from './multiFile'
import * as multiprocess from './multiprocess'
import * as recording from './recording'
import type { AppenderFunction, Configuration, AppenderConfig } from '../types/core'

// Extended appender config that might have a type with configure method
interface ExtendedAppenderConfig {
  type: string | { configure: (...args: unknown[]) => AppenderFunction }
  [key: string]: unknown
}

// Module with potential legacy properties
interface AppenderModule {
  configure: (...args: unknown[]) => AppenderFunction
  appender?: unknown
  shutdown?: unknown
}

const debug = debugFactory('log4js:appenders')

// pre-load the core appenders so that webpack can find them
const coreAppenders = new Map<string, { configure: (...args: unknown[]) => AppenderFunction | Promise<AppenderFunction> | { shutdown: (cb: () => void) => void } }>()
coreAppenders.set('stdout', stdout as any)
coreAppenders.set('stderr', stderr as any)
coreAppenders.set('console', console as any)
coreAppenders.set('file', file as any)
coreAppenders.set('dateFile', dateFile as any)
coreAppenders.set('fileSync', fileSync as any)
coreAppenders.set('tcp', tcp as any)
coreAppenders.set('tcp-server', tcpServer as any)
coreAppenders.set('logLevelFilter', logLevelFilter as any)
coreAppenders.set('categoryFilter', categoryFilter as any)
coreAppenders.set('noLogFilter', noLogFilter as any)
coreAppenders.set('multiFile', multiFile as any)
coreAppenders.set('multiprocess', multiprocess as any)
coreAppenders.set('recording', recording as any)

const appenders = new Map<string, AppenderFunction>()

const tryLoading = async (modulePath: string, config: Configuration): Promise<unknown> => {
  let resolvedPath: string
  try {
    const modulePathCJS = `${modulePath}.cjs`
    resolvedPath = resolve(modulePathCJS)
    debug('Loading module from ', modulePathCJS)
  } catch (e) {
    resolvedPath = modulePath
    debug('Loading module from ', modulePath)
  }
  try {
    return await import(resolvedPath)
  } catch (e: unknown) {
    // if the module was found, and we still got an error, then raise it
    const error = e as { code?: string }
    configuration.throwExceptionIf(
      config,
      error.code !== 'MODULE_NOT_FOUND',
      `appender "${modulePath}" could not be loaded (error was: ${e})`
    )
    return undefined
  }
}

const loadAppenderModule = async (type: string, config: Configuration): Promise<unknown> => {
  return coreAppenders.get(type) ||
    await tryLoading(`./${type}`, config) ||
    await tryLoading(type, config) ||
    (process.mainModule &&
      process.mainModule.filename &&
      await tryLoading(join(dirname(process.mainModule.filename), type), config)) ||
    await tryLoading(join(process.cwd(), type), config)
}

const appendersLoading = new Set<string>()

const getAppender = async (name: string, config: Configuration): Promise<AppenderFunction | false> => {
  if (appenders.has(name)) return appenders.get(name)!
  if (!config.appenders || !config.appenders[name]) return false
  if (appendersLoading.has(name)) { throw new Error(`Dependency loop detected for appender ${name}.`) }
  appendersLoading.add(name)

  debug(`Creating appender ${name}`)
  const appender = await createAppender(name, config)
  appendersLoading.delete(name)
  if (appender) {
    appenders.set(name, appender)
    return appender
  }
  return false
}

const createAppender = async (name: string, config: Configuration): Promise<AppenderFunction | undefined> => {
  if (!config.appenders) return undefined
  const appenderConfig = config.appenders[name] as ExtendedAppenderConfig
  if (!appenderConfig) return undefined

  const appenderModule = typeof appenderConfig.type === 'object' && 'configure' in appenderConfig.type
    ? appenderConfig.type
    : await loadAppenderModule(appenderConfig.type as string, config)
  configuration.throwExceptionIf(
    config,
    configuration.not(appenderModule),
    `appender "${name}" is not valid (type "${typeof appenderConfig.type === 'string' ? appenderConfig.type : 'object'}" could not be found)`
  )

  const moduleWithAppender = appenderModule as AppenderModule
  if (moduleWithAppender.appender) {
    process.emitWarning(
      `Appender ${appenderConfig.type} exports an appender function.`,
      'DeprecationWarning',
      'log4js-node-DEP0001'
    )
    debug(
      '[log4js-node-DEP0001]',
      `DEPRECATION: Appender ${appenderConfig.type} exports an appender function.`
    )
  }
  if (moduleWithAppender.shutdown) {
    process.emitWarning(
      `Appender ${appenderConfig.type} exports a shutdown function.`,
      'DeprecationWarning',
      'log4js-node-DEP0002'
    )
    debug(
      '[log4js-node-DEP0002]',
      `DEPRECATION: Appender ${appenderConfig.type} exports a shutdown function.`
    )
  }

  debug(`${name}: clustering.isMaster ? ${clustering.isMaster()}`)
  debug(
    `${name}: appenderModule is ${JSON.stringify(appenderModule)}`
  )
  return clustering.onlyOnMaster(
    async () => {
      debug(
        `calling appenderModule.configure for ${name} / ${appenderConfig.type}`
      )
      const configForAdapter = {
        ...appenderConfig,
        type: typeof appenderConfig.type === 'string' ? appenderConfig.type : appenderConfig.type.constructor.name || 'custom',
      }
      const result = moduleWithAppender.configure(
        adapters.modifyConfig(configForAdapter as AppenderConfig),
        layouts,
        (appender: string) => getAppender(appender, config),
        Level
      )
      // Handle both sync and async configure functions
      return result instanceof Promise ? await result : result
    },
    /* istanbul ignore next: fn never gets called by non-master yet needed to pass config validation */
    undefined
  )
}

const setup = (config?: Configuration): void => {
  appenders.clear()
  appendersLoading.clear()
  if (!config) {
    return
  }

  const usedAppenders: string[] = []
  Object.values(config.categories || {}).forEach((category) => {
    usedAppenders.push(...category.appenders)
  })
  Object.keys(config.appenders || {}).forEach((name) => {
    // dodgy hard-coding of special case for tcp-server and multiprocess which may not have
    // any categories associated with it, but needs to be started up anyway
    if (
      usedAppenders.includes(name) ||
      config.appenders?.[name]?.type === 'tcp-server' ||
      config.appenders?.[name]?.type === 'multiprocess'
    ) {
      // Create appender synchronously for now
      const appenderConfig = config.appenders?.[name]
      if (appenderConfig) {
        const appenderModule = coreAppenders.get(appenderConfig.type)
        if (appenderModule) {
          const appenderResult = clustering.onlyOnMaster(
            () => {
              debug(`calling appenderModule.configure for ${name} / ${appenderConfig.type}`)
              return appenderModule.configure(
                adapters.modifyConfig(appenderConfig as AppenderConfig),
                layouts,
                (appenderName: string) => appenders.get(appenderName),
                Level
              )
            },
            () => { }
          )
          // Only set if not a Promise (sync appenders only in setup)
          if (appenderResult && !(appenderResult instanceof Promise)) {
            appenders.set(name, appenderResult as AppenderFunction)
            debug(`Created appender ${name}`)
          }
        }
      }
    }
  })
}

const init = (): void => {
  setup()
}
init()

configuration.addListener((config) => {
  configuration.throwExceptionIf(
    config,
    configuration.not(configuration.anObject(config.appenders)),
    'must have a property "appenders" of type object.'
  )
  const appenderNames = Object.keys(config.appenders || {})
  configuration.throwExceptionIf(
    config,
    configuration.not(appenderNames.length),
    'must define at least one appender.'
  )

  appenderNames.forEach((name) => {
    configuration.throwExceptionIf(
      config,
      configuration.not(config.appenders && config.appenders[name] && config.appenders[name].type),
      `appender "${name}" is not valid (must be an object with property "type")`
    )
  })
})

configuration.addListener(setup)

const get = (name: string): AppenderFunction | undefined => appenders.get(name) as AppenderFunction | undefined
const values = (): IterableIterator<AppenderFunction> => appenders.values() as IterableIterator<AppenderFunction>

export {
  get,
  values,
  init,
}

export default appenders
