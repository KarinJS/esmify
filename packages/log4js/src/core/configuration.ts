import util from 'util'
import debugModule from 'debug'

import type { Config } from '../appenders'

const debug = debugModule('log4js:configuration')

type ConfigFunction = (config: Config) => void

/** 预处理监听器列表 */
const preProcessingListeners: ConfigFunction[] = []
/** 配置监听器列表 */
const listeners: ConfigFunction[] = []

/**
 * 逻辑非操作
 * @param thing - 待检查的值
 * @returns 返回布尔值的反值
 */
const not = (thing: unknown) => !thing

/**
 * 检查是否为对象（非数组）
 * @param thing - 待检查的值
 * @returns 返回布尔值的反值
 */
const anObject = (thing: unknown) =>
  thing && typeof thing === 'object' && !Array.isArray(thing)

/**
 * 检查是否为有效标识符
 * @param thing - 待检查的值
 * @returns 返回布尔值的反值
 */
const validIdentifier = (thing: unknown) => {
  return thing && typeof thing === 'string' && /^[A-Za-z][A-Za-z0-9_]*$/g.test(thing)
}

/**
 * 检查是否为整数
 * @param thing - 待检查的值
 * @returns 返回布尔值的反值
 */
const anInteger = (thing: unknown) =>
  thing && typeof thing === 'number' && Number.isInteger(thing)

/**
 * 添加配置监听器
 * @param fn - 监听器函数
 */
const addListener = (fn: ConfigFunction) => {
  listeners.push(fn)
  debug(`已添加监听器，当前共 ${listeners.length} 个监听器`)
}

/**
 * 添加预处理监听器
 * @param fn - 预处理监听器函数
 */
const addPreProcessingListener = (fn: ConfigFunction) => {
  preProcessingListeners.push(fn)
  debug(
    `已添加预处理监听器，当前共 ${preProcessingListeners.length} 个监听器`
  )
}

/**
 * 条件满足时抛出异常
 * @param config - 配置对象
 * @param checks - 单个或多个检查条件
 * @param message - 错误消息
 * @throws 当任一检查条件为真时抛出错误
 */
const throwExceptionIf = (config: unknown, checks: boolean | boolean[], message: string) => {
  const tests = Array.isArray(checks) ? checks : [checks]
  tests.forEach((test) => {
    if (test) {
      throw new Error(
        `log4js 配置问题：(${util.inspect(config, {
          depth: 5,
        })}) - ${message}`
      )
    }
  })
}

/**
 * 配置 log4js
 * @param candidate - 待验证的配置对象
 * @throws 如果配置无效则抛出错误
 */
export const configure = (candidate: Config) => {
  debug('待验证的新配置：', candidate)
  throwExceptionIf(candidate, not(anObject(candidate)), '必须是一个对象。')

  debug(`正在调用预处理监听器（共 ${preProcessingListeners.length} 个）`)
  preProcessingListeners.forEach((listener) => listener(candidate))
  debug('配置预处理完成。')

  debug(`正在调用配置监听器（共 ${listeners.length} 个）`)
  listeners.forEach((listener) => listener(candidate))
  debug('配置完成。')
}

export const configuration = {
  configure,
  addListener,
  addPreProcessingListener,
  throwExceptionIf,
  anObject,
  anInteger,
  validIdentifier,
  not,
  preProcessingListeners,
  listeners,
}
