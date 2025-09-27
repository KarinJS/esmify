// Layout type definitions compatible with original log4js

import type LoggingEvent from '../LoggingEvent'

export type Token = ((logEvent: LoggingEvent) => string) | string

export interface BasicLayout {
  type: 'basic'
}

export interface ColoredLayout {
  type: 'colored' | 'coloured'
}

export interface MessagePassThroughLayout {
  type: 'messagePassThrough'
}

export interface DummyLayout {
  type: 'dummy'
}

export interface PatternLayout {
  type: 'pattern'
  // specifier for the output format, using placeholders as described below
  pattern: string
  // user-defined tokens to be used in the pattern
  tokens?: { [name: string]: Token }
}

export interface CustomLayout {
  [key: string]: unknown
  type: string
}

export type Layout =
  | BasicLayout
  | ColoredLayout
  | MessagePassThroughLayout
  | DummyLayout
  | PatternLayout
  | CustomLayout
