import debugFactory from 'debug'
import cluster from 'node:cluster'
import LoggingEvent from './LoggingEvent'
import * as configuration from './configuration'

// Cluster message types
interface ClusterMessage {
  topic: string
  data: string
}

interface ClusterWorker {
  id?: number
  topic?: string
  data?: string
}

const debug = debugFactory('log4js:clustering')

// Node.js内置cluster模块在Node.js 18+环境下总是可用的
let disabled = false

const listeners: Array<(logEvent: LoggingEvent) => void> = []

let pm2 = false
let pm2InstanceVar = 'NODE_APP_INSTANCE'

const isPM2Master = (): boolean => pm2 && process.env[pm2InstanceVar] === '0'
const isMaster = (): boolean =>
  disabled || (cluster && cluster.isMaster) || isPM2Master()

const sendToListeners = (logEvent: LoggingEvent): void => {
  listeners.forEach((l) => l(logEvent))
}

// in a multi-process node environment, worker loggers will use
// process.send
const receiver = (worker: ClusterWorker | ClusterMessage, message?: ClusterMessage): void => {
  // prior to node v6, the worker parameter was not passed (args were message, handle)
  debug('cluster message received from worker ', worker, ': ', message)
  let actualMessage = message
  if (worker && typeof worker === 'object' && 'topic' in worker && 'data' in worker) {
    actualMessage = worker as ClusterMessage
  }
  if (actualMessage && actualMessage.topic && actualMessage.topic === 'log4js:message') {
    debug('received message: ', actualMessage.data)
    const logEvent = LoggingEvent.deserialise(actualMessage.data)
    sendToListeners(logEvent)
  }
}

if (!disabled) {
  configuration.addListener((config) => {
    // clear out the listeners, because configure has been called.
    listeners.length = 0

    pm2 = config.pm2 || false
    disabled = config.disableClustering || false
    pm2InstanceVar = config.pm2InstanceVar || 'NODE_APP_INSTANCE'

    debug(`clustering disabled ? ${disabled}`)
    debug(`cluster.isMaster ? ${cluster && cluster.isMaster}`)
    debug(`pm2 enabled ? ${pm2}`)
    debug(`pm2InstanceVar = ${pm2InstanceVar}`)
    debug(`process.env[${pm2InstanceVar}] = ${process.env[pm2InstanceVar]}`)

    // just in case configure is called after shutdown
    if (pm2) {
      process.removeListener('message', receiver)
    }
    if (cluster && cluster.removeListener) {
      cluster.removeListener('message', receiver)
    }

    if (disabled || config.disableClustering) {
      debug('Not listening for cluster messages, because clustering disabled.')
    } else if (isPM2Master()) {
      // PM2 cluster support
      // PM2 runs everything as workers - install pm2-intercom for this to work.
      // we only want one of the app instances to write logs
      debug('listening for PM2 broadcast messages')
      process.on('message', receiver)
    } else if (cluster && cluster.isMaster) {
      debug('listening for cluster messages')
      cluster.on('message', receiver)
    } else {
      debug('not listening for messages, because we are not a master process')
    }
  })
}

const onlyOnMaster = <T> (fn: () => T, notMaster?: T): T | undefined => (isMaster() ? fn() : notMaster)

const send = (msg: LoggingEvent): void => {
  if (isMaster()) {
    sendToListeners(msg)
  } else {
    if (!pm2) {
      msg.cluster = {
        workerId: cluster.worker?.id || 0,
        worker: process.pid,
      }
    }
    process.send!({ topic: 'log4js:message', data: msg.serialise() })
  }
}

const onMessage = (listener: (logEvent: LoggingEvent) => void): void => {
  listeners.push(listener)
}

export {
  onlyOnMaster,
  isMaster,
  send,
  onMessage,
}
