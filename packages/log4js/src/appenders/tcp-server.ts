import net from 'net'
import debugModule from 'debug'
import { LoggingEvent } from '../core/LoggingEvent'
import { clustering } from '../core/clustering'

import type { Configure, AppenderConfigBase } from './base'

const debug = debugModule('log4js:tcp-server')

const DELIMITER = '__LOG4JS__'

/**
 * TCP 服务器 Appender 配置接口
 */
export interface TcpServerAppenderConfig extends AppenderConfigBase {
  type: 'tcp-server'
  /** 服务器主机地址 */
  host?: string
  /** 服务器端口 */
  port?: number
}

/**
 * 配置 TCP 服务器 Appender
 * @param config - Appender 配置对象
 * @returns 配置好的 TCP 服务器 Appender
 */
export const configure: Configure<TcpServerAppenderConfig, true> = (config) => {
  debug('configure called with ', config)

  const server = net.createServer((socket) => {
    let dataSoFar = ''
    const send = (data?: string) => {
      if (data) {
        dataSoFar += data
        if (dataSoFar.indexOf(DELIMITER)) {
          const events = dataSoFar.split(DELIMITER)
          if (!dataSoFar.endsWith(DELIMITER)) {
            dataSoFar = events.pop() || ''
          } else {
            dataSoFar = ''
          }
          events
            .filter((e) => e.length)
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

  return Object.assign(
    () => {
      // TCP server appender 不需要主动记录日志，只接收
    },
    {
      shutdown: (cb: (err?: Error) => void) => {
        debug('shutdown called.')
        server.close(cb)
      },
    }
  )
}
