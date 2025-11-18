/* istanbul ignore file */

import type { LoggingEvent } from './LoggingEvent'

/**
 * 浏览器环境的集群模块
 * 此模块仅用于浏览器环境，用于模拟 clustering.js 的行为
 * 使 log4js 的其余部分可以像使用 clustering.js 一样继续运行
 */

/** 日志事件监听器类型 */
type LogEventListener = (logEvent: LoggingEvent) => void

/** 监听器列表 */
const listeners: LogEventListener[] = []

/**
 * 判断是否为主进程
 * 在浏览器环境中始终返回 true
 */
const isMaster = (): boolean => true

/**
 * 发送日志事件到所有监听器
 * @param logEvent - 日志事件对象
 */
const sendToListeners = (logEvent: LoggingEvent): void => {
  listeners.forEach((l) => l(logEvent))
}

/**
 * 仅在主进程执行函数
 * @param fn - 在主进程执行的函数
 * @param notMaster - 不是主进程时执行的函数
 * @returns 执行结果
 */
const onlyOnMaster = <T> (fn: () => T, notMaster?: () => T): T | undefined => {
  return isMaster() ? fn() : notMaster?.()
}

/**
 * 注册日志事件监听器
 * @param listener - 监听器函数
 */
const onMessage = (listener: LogEventListener): void => {
  listeners.push(listener)
}

export const clustering = { onlyOnMaster, isMaster, send: sendToListeners, onMessage }
