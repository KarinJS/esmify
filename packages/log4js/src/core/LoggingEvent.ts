/**
 * 日志事件模块
 * 用于建模和序列化/反序列化日志事件
 */
import * as flatted from 'flatted'
import { levels } from './levels'

import type { LveelMethods } from './levels'

/** 反序列化映射类型 */
type DeserialiseMap = {
  __LOG4JS_undefined__: undefined
  __LOG4JS_NaN__: number
  __LOG4JS_Infinity__: number
  '__LOG4JS_-Infinity__': number
}

/** 序列化映射类型 */
type SerialiseMap = {
  [key: string]: keyof DeserialiseMap
}

/**
 * 序列化/反序列化工具类
 * 用于处理特殊值（undefined、NaN、Infinity 等）的序列化和反序列化
 */
class SerDe {
  /** 反序列化映射表 */
  private deMap: DeserialiseMap
  /** 序列化映射表 */
  private serMap: SerialiseMap

  constructor () {
    const deserialise: DeserialiseMap = {
      __LOG4JS_undefined__: undefined,
      __LOG4JS_NaN__: Number('abc'),
      __LOG4JS_Infinity__: 1 / 0,
      '__LOG4JS_-Infinity__': -1 / 0,
    }
    this.deMap = deserialise
    this.serMap = {} as SerialiseMap
    Object.keys(this.deMap).forEach((key) => {
      const value = this.deMap[key as keyof DeserialiseMap]
      this.serMap[value as any] = key as keyof DeserialiseMap
    })
  }

  /**
   * 判断是否可以序列化
   * @param key - 要检查的键
   * @returns 是否可以序列化
   */
  canSerialise (key: any): boolean {
    if (typeof key === 'string') return false
    return key in this.serMap
  }

  /**
   * 序列化值
   * @param key - 要序列化的值
   * @returns 序列化后的值
   */
  serialise (key: any): any {
    if (this.canSerialise(key)) return this.serMap[key]
    return key
  }

  /**
   * 判断是否可以反序列化
   * @param key - 要检查的键
   * @returns 是否可以反序列化
   */
  canDeserialise (key: any): boolean {
    return key in this.deMap
  }

  /**
   * 反序列化值
   * @param key - 要反序列化的键
   * @returns 反序列化后的值
   */
  deserialise (key: any): any {
    if (this.canDeserialise(key)) return this.deMap[key as keyof DeserialiseMap]
    return key
  }
}

/** 序列化/反序列化工具实例 */
/** 序列化/反序列化工具实例 */
const serde = new SerDe()

/** 位置信息接口 */
export interface LocationInfo {
  /** 文件名 */
  fileName?: string
  /** 行号 */
  lineNumber?: number
  /** 列号 */
  columnNumber?: number
  /** 调用栈 */
  callStack?: string
  /** 类名 */
  className?: string
  /** 函数名 */
  functionName?: string
  /** 函数别名 */
  functionAlias?: string
  /** 调用者名称 */
  callerName?: string
}

/** 日志上下文类型 */
export type LogContext = Record<string, any>

/**
 * 日志事件类
 * 用于建模日志事件
 *
 * @namespace Log4js
 * @author Seth Chisamore
 */
export class LoggingEvent {
  /** 日志开始时间 */
  startTime: Date
  /** 分类名称 */
  categoryName: string
  /** 日志数据 */
  data: any[]
  /** 日志级别 */
  level: LveelMethods
  /** 日志上下文 */
  context: LogContext
  /** 进程 ID */
  pid: number
  /** 错误对象 */
  error?: Error
  /** 集群信息 */
  cluster?: {
    workerId: number
    worker: number
  }

  /** 文件名 */
  fileName?: string
  /** 行号 */
  lineNumber?: number
  /** 列号 */
  columnNumber?: number
  /** 调用栈 */
  callStack?: string
  /** 类名 */
  className?: string
  /** 函数名 */
  functionName?: string
  /** 函数别名 */
  functionAlias?: string
  /** 调用者名称 */
  callerName?: string
  /** 位置信息 */
  location?: LocationInfo

  /**
   * 创建日志事件实例
   * @param categoryName - 分类名称
   * @param level - 日志级别
   * @param data - 要记录的对象数组
   * @param context - 日志上下文
   * @param location - 位置信息
   * @param error - 错误对象（可选）
   */
  constructor (
    categoryName: string,
    level: LveelMethods,
    data: any[],
    context?: LogContext,
    location?: LocationInfo,
    error?: Error
  ) {
    this.startTime = new Date()
    this.categoryName = categoryName
    this.data = data
    this.level = level
    this.context = Object.assign({}, context) // eslint-disable-line prefer-object-spread
    this.pid = process.pid
    this.error = error

    if (typeof location !== 'undefined') {
      if (!location || typeof location !== 'object' || Array.isArray(location)) {
        throw new TypeError(
          '传递给 LoggingEvent 构造函数的位置类型无效'
        )
      }

      LoggingEvent._getLocationKeys().forEach((key) => {
        if (typeof location[key as keyof LocationInfo] !== 'undefined') {
          ; (this as any)[key] = location[key as keyof LocationInfo]
        }
      })
    }
  }

  /**
   * 获取位置信息的键列表
   * @private
   * @returns 位置信息键数组
   */
  private static _getLocationKeys (): (keyof LocationInfo)[] {
    return [
      'fileName',
      'lineNumber',
      'columnNumber',
      'callStack',
      'className',
      'functionName',
      'functionAlias',
      'callerName',
    ]
  }

  /**
   * 序列化日志事件
   * @returns 序列化后的 JSON 字符串
   */
  serialise (): string {
    return flatted.stringify(this, (_key, value) => {
      // JSON.stringify(new Error('test')) 返回 {}，这对我们来说不太有用
      // 以下代码允许我们（半）正确地序列化错误对象
      if (value instanceof Error) {
        // eslint-disable-next-line prefer-object-spread
        value = Object.assign(
          { message: value.message, stack: value.stack },
          value
        )
      }
      // JSON.stringify({a: Number('abc'), b: 1/0, c: -1/0}) 返回 {a: null, b: null, c: null}
      // 以下代码允许我们正确地序列化 NaN、Infinity 和 -Infinity
      // JSON.stringify([undefined]) 返回 [null]
      // 以下代码允许我们正确地序列化 undefined
      return serde.serialise(value)
    })
  }

  /**
   * 反序列化日志事件
   * @param serialised - 序列化的 JSON 字符串
   * @returns 反序列化后的日志事件对象
   */
  static deserialise (serialised: string): LoggingEvent {
    let event: LoggingEvent
    try {
      const rehydratedEvent = flatted.parse(serialised, (_key, value) => {
        if (value && value.message && value.stack) {
          const fakeError = new Error(value) as any
          Object.keys(value).forEach((k) => {
            fakeError[k] = value[k]
          })
          value = fakeError
        }
        return serde.deserialise(value)
      })
      this._getLocationKeys().forEach((key) => {
        if (typeof rehydratedEvent[key] !== 'undefined') {
          if (!rehydratedEvent.location) rehydratedEvent.location = {}
          rehydratedEvent.location[key] = rehydratedEvent[key]
        }
      })
      event = new LoggingEvent(
        rehydratedEvent.categoryName,
        levels.getLevel(rehydratedEvent.level.levelStr),
        rehydratedEvent.data,
        rehydratedEvent.context,
        rehydratedEvent.location,
        rehydratedEvent.error
      )
      event.startTime = new Date(rehydratedEvent.startTime)
      event.pid = rehydratedEvent.pid
      if (rehydratedEvent.cluster) {
        event.cluster = rehydratedEvent.cluster
      }
    } catch (e) {
      event = new LoggingEvent('log4js', levels.ERROR, [
        '无法解析日志：',
        serialised,
        '原因：',
        e,
      ])
    }

    return event
  }
}
