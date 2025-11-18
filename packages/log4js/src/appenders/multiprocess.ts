import net from 'net'
import debugModule from 'debug'
import { AppenderType } from './base'
import { LoggingEvent } from '../core/LoggingEvent'

import type { Level, Levels } from '../core/levels'
import type { LoggingEvent as LoggingEventType } from '../core/LoggingEvent'
import type { Configure, AppenderFunction, AppenderConfigBase } from './base'

const debug = debugModule('log4js:multiprocess')

/** 日志消息结束标记 */
const END_MSG = '__LOG4JS__'

/**
 * 扩展的日志事件（包含远程连接信息）
 */
interface RemoteLoggingEvent extends LoggingEventType {
  remoteAddress?: string
  remotePort?: number
}

/**
 * 错误日志事件
 */
interface ErrorLoggingEvent {
  startTime: Date
  categoryName: string
  level: Level
  data: [string, Error]
  remoteAddress?: string | undefined
  remotePort?: number | undefined
}

/**
 * 多进程 Appender 配置接口
 */
export interface MultiprocessAppenderConfig extends AppenderConfigBase {
  type: 'multiprocess'
  /** 模式：master（主进程）或 worker（工作进程） */
  mode: 'master' | 'worker'
  /** 日志服务器主机地址（默认：localhost） */
  loggerHost?: string
  /** 日志服务器端口（默认：5000） */
  loggerPort?: number
  /** master 模式下的实际 Appender 名称 */
  appender: string
}

/**
 * 主进程 Appender 类
 * 创建日志服务器，监听来自工作进程的日志消息
 */
class MasterAppender {
  private server: net.Server
  private actualAppender: AppenderFunction
  private levels: Levels

  constructor (
    config: MultiprocessAppenderConfig,
    actualAppender: AppenderFunction,
    levels: Levels
  ) {
    this.actualAppender = actualAppender
    this.levels = levels
    this.server = this.createServer(config)
  }

  /**
   * 创建日志服务器
   */
  private createServer (config: MultiprocessAppenderConfig) {
    const server = net.createServer((clientSocket: net.Socket) => {
      debug('(主进程) 收到连接')
      clientSocket.setEncoding('utf8')
      let logMessage = ''

      const chunkReceived = (chunk?: string) => {
        debug('(主进程) 收到数据块')
        logMessage += chunk || ''
        if (logMessage.indexOf(END_MSG) > -1) {
          const event = logMessage.slice(0, logMessage.indexOf(END_MSG))
          this.logTheMessage(clientSocket, event)
          logMessage = logMessage.slice(event.length + END_MSG.length) || ''
          // 检查是否还有更多数据，可能是一个大块
          chunkReceived()
        }
      }

      const handleError = (error: Error) => {
        const loggingEvent: ErrorLoggingEvent = {
          startTime: new Date(),
          categoryName: 'log4js',
          level: this.levels.ERROR,
          data: ['工作进程日志进程意外挂起', error],
          remoteAddress: clientSocket.remoteAddress,
          remotePort: clientSocket.remotePort,
        }
        this.actualAppender(loggingEvent as unknown as LoggingEventType)
      }

      clientSocket.on('data', chunkReceived)
      clientSocket.on('end', chunkReceived)
      clientSocket.on('error', handleError)
    })

    server.listen(
      config.loggerPort || 5000,
      config.loggerHost || 'localhost',
      (e?: Error) => {
        debug('(主进程) 主服务器正在监听，错误：', e)
        // 允许进程退出，如果这是唯一活动的套接字
        server.unref()
      }
    )

    return server
  }

  /**
   * 反序列化日志事件
   */
  private deserializeLoggingEvent (clientSocket: net.Socket, msg: string) {
    debug('(主进程) 反序列化日志事件')
    const loggingEvent: RemoteLoggingEvent = LoggingEvent.deserialise(msg)
    loggingEvent.remoteAddress = clientSocket.remoteAddress
    loggingEvent.remotePort = clientSocket.remotePort
    return loggingEvent
  }

  /**
   * 记录消息
   */
  private logTheMessage (clientSocket: net.Socket, msg: string) {
    debug('(主进程) 反序列化日志事件并发送到实际 appender')
    this.actualAppender(this.deserializeLoggingEvent(clientSocket, msg))
  }

  /**
   * 记录日志事件（本地事件）
   */
  log (event: LoggingEventType) {
    debug('(主进程) 日志事件直接发送到实际 appender（本地事件）')
    this.actualAppender(event)
  }

  /**
   * 关闭服务器
   */
  shutdown (cb: (err?: Error) => void) {
    debug('(主进程) 主进程关闭调用，正在关闭服务器')
    this.server.close(cb)
  }
}

/**
 * 工作进程 Appender 类
 * 连接到主进程日志服务器，发送日志消息
 */
class WorkerAppender {
  private canWrite = false
  private buffer: LoggingEventType[] = []
  private socket!: net.Socket
  private shutdownAttempts = 3
  private config: MultiprocessAppenderConfig

  constructor (config: MultiprocessAppenderConfig) {
    this.config = config
    this.createSocket()
  }

  /**
   * 创建套接字连接
   */
  private createSocket () {
    debug(
      `(工作进程) 工作进程 appender 正在创建套接字连接到 ${this.config.loggerHost || 'localhost'}:${this.config.loggerPort || 5000}`
    )
    this.socket = net.createConnection(
      this.config.loggerPort || 5000,
      this.config.loggerHost || 'localhost'
    )
    this.socket.on('connect', () => {
      debug('(工作进程) 工作进程套接字已连接')
      this.emptyBuffer()
      this.canWrite = true
    })
    this.socket.on('timeout', this.socket.end.bind(this.socket))
    this.socket.on('error', (e: Error) => {
      debug('连接错误', e)
      this.canWrite = false
      this.emptyBuffer()
    })
    this.socket.on('close', () => this.createSocket())
  }

  /**
   * 写入日志事件到套接字
   */
  private write (loggingEvent: LoggingEventType) {
    debug('(工作进程) 将日志事件写入套接字')
    this.socket.write(loggingEvent.serialise(), 'utf8')
    this.socket.write(END_MSG, 'utf8')
  }

  /**
   * 清空缓冲区
   */
  private emptyBuffer () {
    let evt: LoggingEventType | undefined
    debug('(工作进程) 正在清空工作进程缓冲区')
    while ((evt = this.buffer.shift())) {
      this.write(evt)
    }
  }

  /**
   * 记录日志事件
   */
  log (loggingEvent: LoggingEventType) {
    if (this.canWrite) {
      this.write(loggingEvent)
    } else {
      debug('(工作进程) 工作进程正在缓冲日志事件，因为当前无法写入')
      this.buffer.push(loggingEvent)
    }
  }

  /**
   * 关闭工作进程 Appender
   */
  shutdown (cb: (err?: Error) => void) {
    debug('(工作进程) 工作进程关闭调用')
    if (this.buffer.length && this.shutdownAttempts) {
      debug('(工作进程) 工作进程缓冲区有项目，等待 100ms 清空')
      this.shutdownAttempts -= 1
      setTimeout(() => {
        this.shutdown(cb)
      }, 100)
    } else {
      this.socket.removeAllListeners('close')
      this.socket.end(cb)
    }
  }
}

/**
 * 配置多进程 Appender
 * @param config - Appender 配置对象
 * @param layouts - 布局管理器
 * @param findAppender - 查找 Appender 的函数
 * @param levels - 级别管理器
 * @returns 配置好的多进程 Appender
 */
export const configure: Configure<MultiprocessAppenderConfig, true> = (
  config,
  _layouts,
  findAppender,
  levels
) => {
  debug(`配置模式 = ${config.mode}`)

  let appender: MasterAppender | WorkerAppender

  if (config.mode === 'master') {
    if (!config.appender) {
      debug(`配置中未找到 appender ${config}`)
      throw new Error('多进程主进程必须定义 "appender"')
    }
    debug(`实际 appender 是 ${config.appender}`)
    const actualAppender = findAppender(config.appender as unknown as AppenderType)
    if (!actualAppender) {
      debug(`未找到实际 appender "${config.appender}"`)
      throw new Error(`多进程主进程 appender "${config.appender}" 未定义`)
    }
    debug('正在创建主进程 appender')
    appender = new MasterAppender(config, actualAppender, levels)
  } else {
    debug('正在创建工作进程 appender')
    appender = new WorkerAppender(config)
  }

  return Object.assign(
    (loggingEvent: LoggingEventType) => appender.log(loggingEvent),
    {
      shutdown: (cb: (err?: Error) => void) => appender.shutdown(cb),
    }
  )
}
