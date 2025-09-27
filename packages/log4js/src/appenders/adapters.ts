import type { AppenderConfig } from '../types/core'

function maxFileSizeUnitTransform (maxLogSize: unknown): number {
  if (typeof maxLogSize === 'number' && Number.isInteger(maxLogSize)) {
    return maxLogSize
  }

  if (typeof maxLogSize !== 'string') {
    throw Error(`maxLogSize: "${maxLogSize}" is invalid`)
  }

  const units: Record<string, number> = {
    K: 1024,
    M: 1024 * 1024,
    G: 1024 * 1024 * 1024,
  }
  const validUnit = Object.keys(units)
  const unit = maxLogSize.slice(-1).toLocaleUpperCase()
  const value = maxLogSize.slice(0, -1).trim()

  if (validUnit.indexOf(unit) < 0 || !Number.isInteger(Number(value))) {
    throw Error(`maxLogSize: "${maxLogSize}" is invalid`)
  } else {
    return Number(value) * units[unit]
  }
}

type ConfigTransformer = (value: unknown) => unknown

interface FileAppenderConfig extends AppenderConfig {
  maxLogSize?: string | number
}

function adapter<T extends AppenderConfig> (
  configAdapter: Record<string, ConfigTransformer>,
  config: T
): T {
  const newConfig = Object.assign({}, config) as T
  Object.keys(configAdapter).forEach((key) => {
    if (key in newConfig && newConfig[key as keyof T] !== undefined) {
      (newConfig as Record<string, unknown>)[key] = configAdapter[key](newConfig[key as keyof T])
    }
  })
  return newConfig
}

function fileAppenderAdapter (config: FileAppenderConfig): FileAppenderConfig {
  const configAdapter: Record<string, ConfigTransformer> = {
    maxLogSize: maxFileSizeUnitTransform,
  }
  return adapter(configAdapter, config)
}

const adapters: Record<string, (config: AppenderConfig) => AppenderConfig> = {
  dateFile: fileAppenderAdapter,
  file: fileAppenderAdapter,
  fileSync: fileAppenderAdapter,
}

export const modifyConfig = (config: AppenderConfig): AppenderConfig =>
  adapters[config.type] ? adapters[config.type](config) : config
