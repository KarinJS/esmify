import { resolve, join, dirname } from 'node:path'
import debugFactory from 'debug'
import * as configuration from '../configuration'
import * as clustering from '../clustering'
import Level from '../levels'
import * as layouts from '../layouts'
import * as adapters from './adapters'
import * as stdout from './stdout'
import * as console from './console'
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
const coreAppenders = new Map<string, { configure: (...args: unknown[]) => AppenderFunction }>()
coreAppenders.set('stdout', stdout as { configure: (...args: unknown[]) => AppenderFunction })
coreAppenders.set('console', console as { configure: (...args: unknown[]) => AppenderFunction })

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
    () => {
      debug(
        `calling appenderModule.configure for ${name} / ${appenderConfig.type}`
      )
      const configForAdapter = {
        ...appenderConfig,
        type: typeof appenderConfig.type === 'string' ? appenderConfig.type : appenderConfig.type.constructor.name || 'custom',
      }
      return moduleWithAppender.configure(
        adapters.modifyConfig(configForAdapter as AppenderConfig),
        layouts,
        (appender: string) => getAppender(appender, config),
        Level
      )
    },
    /* istanbul ignore next: fn never gets called by non-master yet needed to pass config validation */() => { }
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
          const appender = clustering.onlyOnMaster(
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
          if (appender) {
            appenders.set(name, appender)
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
