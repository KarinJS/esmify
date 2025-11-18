import type { LoggingEvent } from '../core/LoggingEvent'

/** 布局配置接口 */
export type Layout =
  | BasicLayout
  | ColoredLayout
  | MessagePassThroughLayout
  | DummyLayout
  | PatternLayout
// | CustomLayout

/** 基本布局配置接口 */
export interface BasicLayout {
  type: 'basic'
}

/** 彩色布局配置接口 */
export interface ColoredLayout {
  type: 'colored' | 'coloured'
}

/** 消息直通布局配置接口 */
export interface MessagePassThroughLayout {
  type: 'messagePassThrough'
}

/** 空布局配置接口 */
export interface DummyLayout {
  type: 'dummy'
}

// export interface CustomLayout {
//   [key: string]: any
//   type: string
// }

/**
 * 自定义标记函数类型
 */
export type TokenFunction = (
  /** 日志事件对象 */
  loggingEvent: LoggingEvent
) => string

/**
 * 模式布局配置接口
 */
export interface PatternLayout {
  /** 布局类型 */
  type: 'pattern'
  /** 模式字符串 */
  pattern: string
  /** 自定义标记映射表 */
  tokens?: Record<string, TokenFunction>
}

export type LayoutConfig = Layout
