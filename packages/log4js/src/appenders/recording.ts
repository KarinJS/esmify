import debugModule from 'debug'

import type { LoggingEvent } from '../core/LoggingEvent'
import type { Configure, AppenderConfigBase } from './base'

const debug = debugModule('log4js:recording')

/**
 * 记录 Appender 配置接口
 */
export interface RecordingAppenderConfig extends AppenderConfigBase {
  type: 'recording'
}

/** 记录的日志事件数组 */
const recordedEvents: LoggingEvent[] = []

/**
 * 配置记录 Appender
 * @returns 记录 Appender 函数
 */
export const configure: Configure<RecordingAppenderConfig> = () => {
  return (logEvent) => {
    debug(
      `收到日志事件，当前事件数量：${recordedEvents.length + 1}`
    )
    debug('日志事件内容：', logEvent)
    recordedEvents.push(logEvent)
  }
}

/**
 * 重放记录的日志事件
 * @returns 记录的日志事件数组的副本
 */
function replay (): LoggingEvent[] {
  return recordedEvents.slice()
}

/**
 * 重置记录的日志事件
 */
function reset (): void {
  recordedEvents.length = 0
}

export const recording = {
  configure,
  replay,
  playback: replay,
  reset,
  erase: reset,
}
