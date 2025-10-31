import debugFactory from 'debug'
import { createConnection, Socket } from 'node:net'
import type LoggingEvent from '../LoggingEvent'
import type { AppenderFunction, LayoutFunction, LayoutsParam } from '../types/core'
import type { TCPAppender } from '../types/appenders'

const debug = debugFactory('log4js:tcp')

interface AppenderWithShutdown extends AppenderFunction {
  shutdown: (cb: () => void) => void
}

function appender (config: TCPAppender, layout: LayoutFunction): AppenderWithShutdown {
  let canWrite = false
  const buffer: LoggingEvent[] = []
  let socket: Socket
  let shutdownAttempts = 3
  const endMsg = config.endMsg || '__LOG4JS__'

  function write (loggingEvent: LoggingEvent): void {
    debug('Writing log event to socket')
    canWrite = socket.write(`${layout(loggingEvent)}${endMsg}`, 'utf8')
  }

  function emptyBuffer (): void {
    let evt: LoggingEvent | undefined
    debug('emptying buffer')
    while ((evt = buffer.shift())) {
      write(evt)
    }
  }

  function createSocket (): void {
    debug(
      `appender creating socket to ${config.host || 'localhost'}:${config.port || 5000
      }`
    )
    socket = createConnection(
      config.port || 5000,
      config.host || 'localhost'
    )
    socket.on('connect', () => {
      debug('socket connected')
      emptyBuffer()
      canWrite = true
    })
    socket.on('drain', () => {
      debug('drain event received, emptying buffer')
      canWrite = true
      emptyBuffer()
    })
    socket.on('timeout', () => socket.end())
    socket.on('error', (e: Error) => {
      debug('connection error', e)
      canWrite = false
      emptyBuffer()
    })
    socket.on('close', createSocket)
  }

  createSocket()

  const log = function (loggingEvent: LoggingEvent): void {
    if (canWrite) {
      write(loggingEvent)
    } else {
      debug('buffering log event because it cannot write at the moment')
      buffer.push(loggingEvent)
    }
  } as AppenderWithShutdown

  log.shutdown = function (cb: () => void): void {
    debug('shutdown called')
    if (buffer.length && shutdownAttempts) {
      debug('buffer has items, waiting 100ms to empty')
      shutdownAttempts -= 1
      setTimeout(() => {
        log.shutdown(cb)
      }, 100)
    } else {
      socket.removeAllListeners('close')
      socket.end(cb)
    }
  }

  return log
}

function configure (config: TCPAppender, layouts: LayoutsParam): AppenderFunction {
  debug(`configure with config = ${JSON.stringify(config)}`)
  let layout: LayoutFunction = (loggingEvent: LoggingEvent) => {
    return loggingEvent.serialise()
  }
  if (config.layout) {
    layout = layouts.layout(config.layout.type, config.layout as Record<string, unknown>) || layout
  }
  return appender(config, layout)
}

export { configure }
