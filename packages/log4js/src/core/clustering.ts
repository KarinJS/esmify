/**
 * 集群支持模块
 * 用于在多进程 Node.js 环境中协调日志记录
 * 支持原生 cluster 模块和 PM2 集群
 */

import debug from 'debug'
import { LoggingEvent } from './LoggingEvent'
import { configuration } from './configuration'
import cluster from 'node:cluster'

import type { Config } from '../appenders'
import type { LoggingEvent as LoggingEventType } from './LoggingEvent'

/** 调试日志函数 */
const debugLog = debug('log4js:clustering')

/** 是否禁用集群功能 */
let disabled = false

/** 日志事件监听器类型 */
type LogEventListener = (logEvent: LoggingEventType) => void

/** 日志事件监听器列表 */
const listeners: LogEventListener[] = []

/** 是否启用 PM2 */
let pm2 = false

/** PM2 实例变量名 */
let pm2InstanceVar = 'NODE_APP_INSTANCE'

/**
 * 判断是否为 PM2 主进程
 * @returns 是否为 PM2 主进程
 */
const isPM2Master = (): boolean => pm2 && process.env[pm2InstanceVar] === '0'

/**
 * 判断是否为主进程
 * @returns 是否为主进程
 */
const isMaster = (): boolean => disabled || (cluster && cluster.isMaster) || isPM2Master()

/**
 * 发送日志事件到所有监听器
 * @param logEvent - 日志事件对象
 */
const sendToListeners = (logEvent: LoggingEventType): void => {
  listeners.forEach((l) => l(logEvent))
}

/** 集群消息接口 */
interface ClusterMessage {
  /** 消息主题 */
  topic?: string
  /** 消息数据 */
  data?: any
}

/**
 * 接收来自工作进程的消息
 * 在多进程 Node.js 环境中，工作进程日志记录器将使用 process.send
 *
 * @param worker - 工作进程对象或消息对象
 * @param message - 消息对象
 */
const receiver = (worker: any, message?: ClusterMessage): void => {
  // 在 node v6 之前，不会传递 worker 参数（参数为 message, handle）
  debugLog('收到来自工作进程的集群消息 ', worker, ': ', message)
  if (worker.topic && worker.data) {
    message = worker
    worker = undefined
  }
  if (message && message.topic && message.topic === 'log4js:message') {
    debugLog('收到消息：', message.data)
    const logEvent = LoggingEvent.deserialise(message.data)
    sendToListeners(logEvent)
  }
}

if (!disabled) {
  configuration.addListener((config: Config) => {
    // 清空监听器列表，因为 configure 已被调用
    listeners.length = 0

    pm2 = config.pm2 || false
    disabled = config.disableClustering || false
    pm2InstanceVar = config.pm2InstanceVar || 'NODE_APP_INSTANCE'

    debugLog(`集群功能已禁用？${disabled}`)
    debugLog(`cluster.isMaster？${cluster && cluster.isMaster}`)
    debugLog(`pm2 已启用？${pm2}`)
    debugLog(`pm2InstanceVar = ${pm2InstanceVar}`)
    debugLog(`process.env[${pm2InstanceVar}] = ${process.env[pm2InstanceVar]}`)

    // 以防在关闭后调用 configure
    if (pm2) {
      process.removeListener('message', receiver)
    }
    if (cluster && cluster.removeListener) {
      cluster.removeListener('message', receiver)
    }

    if (disabled || config.disableClustering) {
      debugLog('不监听集群消息，因为集群功能已禁用。')
    } else if (isPM2Master()) {
      // PM2 集群支持
      // PM2 将所有内容作为工作进程运行 - 需要安装 pm2-intercom 才能正常工作
      // 我们只希望其中一个应用实例写入日志
      debugLog('监听 PM2 广播消息')
      process.on('message', receiver)
    } else if (cluster && cluster.isMaster) {
      debugLog('监听集群消息')
      cluster.on('message', receiver)
    } else {
      debugLog('不监听消息，因为我们不是主进程')
    }
  })
}

/**
 * 仅在主进程执行函数
 * @param fn - 在主进程执行的函数
 * @param _notMaster - 不是主进程时执行的函数 这个永远都不会被调用
 * @returns 执行结果
 */
const onlyOnMaster = <T> (fn: () => T, _notMaster: () => T): T => {
  return fn()
}

/**
 * 发送日志消息
 * @param msg - 日志事件对象
 */
const send = (msg: LoggingEventType): void => {
  if (isMaster()) {
    sendToListeners(msg)
  } else {
    if (!pm2) {
      msg.cluster = {
        workerId: cluster!.worker!.id,
        worker: process.pid,
      }
    }
    process.send!({ topic: 'log4js:message', data: msg.serialise() })
  }
}

/**
 * 注册日志事件监听器
 * @param listener - 监听器函数
 */
const onMessage = (listener: LogEventListener): void => {
  listeners.push(listener)
}

export const clustering = { onlyOnMaster, isMaster, send, onMessage }
