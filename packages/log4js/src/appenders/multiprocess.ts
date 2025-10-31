import debugFactory from 'debug'
import { createServer, createConnection, Server, Socket } from 'node:net'
import LoggingEvent from '../LoggingEvent'
import type { AppenderFunction, Levels } from '../types/core'
import type { MultiprocessAppender } from '../types/appenders'

const debug = debugFactory('log4js:multiprocess')

const END_MSG = '__LOG4JS__'

interface AppenderWithShutdown extends AppenderFunction {
  shutdown: (cb: () => void) => void
}

/**
 * Creates a server, listening on config.loggerPort, config.loggerHost.
 * Output goes to actualAppender (config.appender is used to set up that appender).
 */
function logServer (
  config: MultiprocessAppender,
  actualAppender: AppenderFunction,
  levels: Levels
): AppenderWithShutdown {
  /**
   * Takes a utf-8 string, returns an object with the correct log properties.
   */
  function deserializeLoggingEvent (clientSocket: Socket, msg: string): LoggingEvent {
    debug('(master) deserialising log event')
    const loggingEvent = LoggingEvent.deserialise(msg)
      ; (loggingEvent as unknown as Record<string, unknown>).remoteAddress = clientSocket.remoteAddress
      ; (loggingEvent as unknown as Record<string, unknown>).remotePort = clientSocket.remotePort

    return loggingEvent
  }

  const server: Server = createServer((clientSocket: Socket) => {
    debug('(master) connection received')
    clientSocket.setEncoding('utf8')
    let logMessage = ''

    function logTheMessage (msg: string): void {
      debug('(master) deserialising log event and sending to actual appender')
      actualAppender(deserializeLoggingEvent(clientSocket, msg))
    }

    function chunkReceived (chunk?: string): void {
      debug('(master) chunk of data received')
      let event: string
      logMessage += chunk || ''
      if (logMessage.indexOf(END_MSG) > -1) {
        event = logMessage.slice(0, logMessage.indexOf(END_MSG))
        logTheMessage(event)
        logMessage = logMessage.slice(event.length + END_MSG.length) || ''
        // check for more, maybe it was a big chunk
        chunkReceived()
      }
    }

    function handleError (error: Error): void {
      const loggingEvent = new LoggingEvent(
        'log4js',
        levels.ERROR,
        ['A worker log process hung up unexpectedly', error],
        {}
      )
        ; (loggingEvent as unknown as Record<string, unknown>).remoteAddress = clientSocket.remoteAddress
        ; (loggingEvent as unknown as Record<string, unknown>).remotePort = clientSocket.remotePort
      actualAppender(loggingEvent)
    }

    clientSocket.on('data', chunkReceived)
    clientSocket.on('end', chunkReceived)
    clientSocket.on('error', handleError)
  })

  server.listen(
    config.loggerPort || 5000,
    config.loggerHost || 'localhost',
    () => {
      debug('(master) master server listening')
      // allow the process to exit, if this is the only socket active
      server.unref()
    }
  )

  const app = function (event: LoggingEvent): void {
    debug('(master) log event sent directly to actual appender (local event)')
    return actualAppender(event)
  } as AppenderWithShutdown

  app.shutdown = function (cb: () => void): void {
    debug('(master) master shutdown called, closing server')
    server.close(cb)
  }

  return app
}

function workerAppender (config: MultiprocessAppender): AppenderWithShutdown {
  let canWrite = false
  const buffer: LoggingEvent[] = []
  let socket: Socket
  let shutdownAttempts = 3

  function write (loggingEvent: LoggingEvent): void {
    debug('(worker) Writing log event to socket')
    socket.write(loggingEvent.serialise(), 'utf8')
    socket.write(END_MSG, 'utf8')
  }

  function emptyBuffer (): void {
    let evt: LoggingEvent | undefined
    debug('(worker) emptying worker buffer')
    while ((evt = buffer.shift())) {
      write(evt)
    }
  }

  function createSocket (): void {
    debug(
      `(worker) worker appender creating socket to ${config.loggerHost || 'localhost'
      }:${config.loggerPort || 5000}`
    )
    socket = createConnection(
      config.loggerPort || 5000,
      config.loggerHost || 'localhost'
    )
    socket.on('connect', () => {
      debug('(worker) worker socket connected')
      emptyBuffer()
      canWrite = true
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
      debug(
        '(worker) worker buffering log event because it cannot write at the moment'
      )
      buffer.push(loggingEvent)
    }
  } as AppenderWithShutdown

  log.shutdown = function (cb: () => void): void {
    debug('(worker) worker shutdown called')
    if (buffer.length && shutdownAttempts) {
      debug('(worker) worker buffer has items, waiting 100ms to empty')
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

function createAppender (
  config: MultiprocessAppender,
  appender: AppenderFunction,
  levels: Levels
): AppenderWithShutdown {
  if (config.mode === 'master') {
    debug('Creating master appender')
    return logServer(config, appender, levels)
  }

  debug('Creating worker appender')
  return workerAppender(config)
}

async function configure (
  config: MultiprocessAppender,
  _layouts: unknown,
  findAppender: (name: string) => Promise<AppenderFunction | false>,
  levels: Levels
): Promise<AppenderFunction> {
  let appender: AppenderFunction | false = false
  debug(`configure with mode = ${config.mode}`)

  if (config.mode === 'master') {
    if (!config.appender) {
      debug(`no appender found in config ${JSON.stringify(config)}`)
      throw new Error('multiprocess master must have an "appender" defined')
    }
    debug(`actual appender is ${config.appender}`)
    appender = await findAppender(config.appender)
    if (!appender) {
      debug(`actual appender "${config.appender}" not found`)
      throw new Error(
        `multiprocess master appender "${config.appender}" not defined`
      )
    }
  }
  return createAppender(config, appender as AppenderFunction, levels)
}

export { configure }
