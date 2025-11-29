import stringifyImpl from './stringify'
import parseImpl from './parse'
import * as formats from './formats'

// Type definitions matching official @types/qs signatures
import type { IStringifyOptions, IParseOptions, ParsedQs, BooleanOptional } from './types'

// Re-export types
export type {
  IStringifyOptions,
  IStringifyBaseOptions,
  IStringifyDynamicOptions,
  IParseOptions,
  IParseBaseOptions,
  IParseDynamicOptions,
  ParsedQs,
  BooleanOptional,
  defaultEncoder,
  defaultDecoder,
} from './types'

// Re-export format types and values
export type { Formatter, Formatters } from './formats'
export { Format } from './formats'

// Export formats namespace
export { formats }

// Overloaded parse function signatures
export function parse (str: string, options?: IParseOptions<BooleanOptional> & { decoder?: never | undefined }): ParsedQs
export function parse (str: string | Record<string, string>, options?: IParseOptions<BooleanOptional>): { [key: string]: unknown }
export function parse (str: string | Record<string, string>, options?: IParseOptions<BooleanOptional>): ParsedQs | { [key: string]: unknown } {
  return parseImpl(str, options)
}

// Stringify function signature
export function stringify (obj: any, options?: IStringifyOptions<BooleanOptional>): string {
  return stringifyImpl(obj, options)
}

// Default export for compatibility
const qs = {
  stringify,
  parse,
  formats,
}

export default qs
