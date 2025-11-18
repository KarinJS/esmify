import type { ConfigAppendersValue } from '.'

/**
 * 单位定义
 */
interface Units {
  K: number
  M: number
  G: number
  [key: string]: number
}

/**
 * 配置适配器类型
 */
type ConfigAdapter = {
  [key: string]: (value: any) => any
}

/**
 * 最大文件大小单位转换
 * @param maxLogSize - 最大日志大小（可以是数字或带单位的字符串，如 "10M"）
 * @returns 转换后的字节数
 */
function maxLogSize (maxLogSize: number | string) {
  if (typeof maxLogSize === 'number' && Number.isInteger(maxLogSize)) {
    return maxLogSize
  }

  const units: Units = {
    K: 1024,
    M: 1024 * 1024,
    G: 1024 * 1024 * 1024,
  }
  const validUnit = Object.keys(units)
  const unit = (maxLogSize as string).slice(-1).toLocaleUpperCase()
  const value = (maxLogSize as string).slice(0, -1).trim()

  if (validUnit.indexOf(unit) < 0 || !Number.isInteger(Number(value))) {
    throw Error(`maxLogSize: "${maxLogSize}" 无效`)
  }
  return Number(value) * units[unit]
}

/**
 * 配置适配器
 * @param configAdapter - 配置适配器映射
 * @param config - 原始配置
 * @returns 适配后的配置
 */
function adapter (configAdapter: ConfigAdapter, config: ConfigAppendersValue): ConfigAppendersValue {
  const cfg = Object.assign({}, config) as Record<string, any>
  Object.keys(configAdapter).forEach((key) => {
    if (cfg[key]) {
      if (typeof configAdapter[key] !== 'function') return
      // @ts-ignore
      cfg[key] = configAdapter[key](config[key])
    }
  })
  return cfg as ConfigAppendersValue
}

/**
 * 文件 Appender 适配器
 * @param config - 文件 Appender 配置
 * @returns 适配后的配置
 */
const fileAppenderAdapter = (config: ConfigAppendersValue) => adapter({ maxLogSize }, config)

/**
 * Appender 适配器映射
 */
const adapters: Record<string, (config: ConfigAppendersValue) => ConfigAppendersValue> = {
  dateFile: fileAppenderAdapter,
  file: fileAppenderAdapter,
  fileSync: fileAppenderAdapter,
}

/**
 * 修改配置
 * @param config - Appender 配置
 * @returns 修改后的配置
 */
export const modifyConfig = (config: ConfigAppendersValue) => {
  if (typeof config?.type !== 'string') return config
  return adapters[config.type] ? adapters[config.type](config) : config
}
