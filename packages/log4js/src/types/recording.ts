// Recording functionality types

import type LoggingEvent from '../LoggingEvent'

/**
 * Recording interface for capturing log events
 */
export interface Recording {
  /**
   * Get all recorded events
   */
  replay (): LoggingEvent[]

  /**
   * Clear all recorded events
   */
  reset (): void

  /**
   * Play recorded events to another appender
   */
  playback (): LoggingEvent[]
}

/**
 * Format type for connect-logger middleware
 */
export type Format =
  | string
  | ((req: unknown, res: unknown, formatter: (str: string) => string) => string)

/**
 * Log4js main interface type
 */
export interface Log4js {
  getLogger (category?: string): import('../logger').default
  configure (filename: string): Log4js
  configure (config: import('./core').Configuration): Log4js
  isConfigured (): boolean
  addLayout (
    name: string,
    config: (a: unknown) => (logEvent: LoggingEvent) => string
  ): void
  connectLogger (
    logger: import('../logger').default,
    options: { format?: Format; level?: string; nolog?: unknown }
  ): unknown // express.Handler;
  levels: import('./core').Levels
  shutdown (cb?: (error?: Error) => void): void
}
