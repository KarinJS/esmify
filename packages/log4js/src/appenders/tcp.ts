import net from 'net'
import debugModule from 'debug'

import type { LoggingEvent } from '../core/LoggingEvent'
import type { Configure, AppenderConfigBase } from './base'

const debug = debugModule('log4js:tcp')

/**
 * TCP Appender 配置接口
 */
export interface TcpAppenderConfig extends AppenderConfigBase {
  type: 'tcp'
  /** 服务器主机地址 */
  host?: string
  /** 服务器端口 */
  port?: number
  /** 消息结束标记 */
  endMsg?: string
}

/**
 * 配置 TCP Appender
 * @param config - Appender 配置对象
 * @param layouts - 布局管理器
 * @returns 配置好的 TCP Appender
 */
export const configure: Configure<TcpAppenderConfig, true> = (config, layouts) => {
  debug(`使用配置进行配置 = ${config}`)

  const layout = config.layout
    ? layouts.layout(config.layout.type, config.layout) || ((loggingEvent: LoggingEvent) => loggingEvent.serialise())
    : (loggingEvent: LoggingEvent) => loggingEvent.serialise()

  let canWrite = false
  const buffer: LoggingEvent[] = []
  let socket: net.Socket
  let shutdownAttempts = 3
  const endMsg = config.endMsg || '__LOG4JS__'

  const write = (loggingEvent: LoggingEvent) => {
    debug('将日志事件写入 socket')
    canWrite = socket.write(`${layout(loggingEvent)}${endMsg}`, 'utf8')
  }

  const emptyBuffer = () => {
    let evt: LoggingEvent | undefined
    debug('清空缓冲区')
    while ((evt = buffer.shift())) {
      write(evt)
    }
  }

  const createSocket = () => {
    debug(
      `appender 创建 socket 连接到 ${config.host || 'localhost'}:${config.port || 5000}`
    )
    socket = net.createConnection(
      config.port || 5000,
      config.host || 'localhost'
    )
    socket.on('connect', () => {
      debug('socket 已连接')
      emptyBuffer()
      canWrite = true
    })
    socket.on('drain', () => {
      debug('收到 drain 事件，清空缓冲区')
      canWrite = true
      emptyBuffer()
    })
    socket.on('timeout', socket.end.bind(socket))
    socket.on('error', (e: Error) => {
      debug('连接错误', e)
      canWrite = false
      emptyBuffer()
    })
    socket.on('close', createSocket)
  }

  createSocket()

  const app = Object.assign(
    (loggingEvent: LoggingEvent) => {
      if (canWrite) {
        write(loggingEvent)
      } else {
        debug('由于当前无法写入，缓冲日志事件')
        buffer.push(loggingEvent)
      }
    },
    {
      shutdown: (cb: () => void) => {
        debug('调用 shutdown')
        if (buffer.length && shutdownAttempts) {
          debug('缓冲区有数据，等待 100ms 清空')
          shutdownAttempts -= 1
          setTimeout(() => {
            app.shutdown(cb)
          }, 100)
        } else {
          socket.removeAllListeners('close')
          socket.end(cb)
        }
      },
    }
  )

  return app
}
