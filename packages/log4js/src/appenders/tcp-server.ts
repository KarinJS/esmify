import debugFactory from 'debug'
import { createServer, Server, Socket } from 'node:net'
import * as clustering from '../clustering'
import LoggingEvent from '../LoggingEvent'
import type { TCPServerAppender } from '../types/appenders'

const debug = debugFactory('log4js:tcp-server')

const DELIMITER = '__LOG4JS__'

interface AppenderWithShutdown {
  shutdown: (cb: () => void) => void
}

function configure (config: TCPServerAppender): AppenderWithShutdown {
  debug('configure called with', config)

  const server: Server = createServer((socket: Socket) => {
    let dataSoFar = ''

    const send = (data?: string): void => {
      if (data) {
        dataSoFar += data
        if (dataSoFar.indexOf(DELIMITER) !== -1) {
          const events = dataSoFar.split(DELIMITER)
          if (!dataSoFar.endsWith(DELIMITER)) {
            dataSoFar = events.pop() || ''
          } else {
            dataSoFar = ''
          }
          events
            .filter((e) => e.length > 0)
            .forEach((e) => {
              clustering.send(LoggingEvent.deserialise(e))
            })
        } else {
          dataSoFar = ''
        }
      }
    }

    socket.setEncoding('utf8')
    socket.on('data', send)
    socket.on('end', send)
  })

  server.listen(config.port || 5000, config.host || 'localhost', () => {
    debug(`listening on ${config.host || 'localhost'}:${config.port || 5000}`)
    server.unref()
  })

  return {
    shutdown: (cb: () => void): void => {
      debug('shutdown called.')
      server.close(cb)
    },
  }
}

export { configure }
