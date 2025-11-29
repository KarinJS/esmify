/**
 * Type definitions for qs (Query String)
 * Matches the official @types/qs type signatures
 */

// Encoder and Decoder function types
export type defaultEncoder = (str: any, defaultEncoder?: any, charset?: string) => string
export type defaultDecoder = (str: string, decoder?: any, charset?: string) => string

export type BooleanOptional = boolean | undefined

// Internal encoder type (more flexible for internal use)
export type Encoder = (str: any, defaultEncoder?: any, charset?: string, kind?: string, format?: any) => string
export type Decoder = (str: string, defaultDecoder?: any, charset?: string, type?: 'key' | 'value') => any

// Base options for stringify
export interface IStringifyBaseOptions {
  delimiter?: string | undefined
  strictNullHandling?: boolean | undefined
  skipNulls?: boolean | undefined
  encode?: boolean | undefined
  encoder?:
  | ((str: any, defaultEncoder: defaultEncoder, charset: string, type: 'key' | 'value') => string)
  | undefined
  filter?: Array<string | number> | ((prefix: string, value: any) => any) | undefined
  arrayFormat?: 'indices' | 'brackets' | 'repeat' | 'comma' | undefined
  indices?: boolean | undefined
  sort?: ((a: string, b: string) => number) | undefined
  serializeDate?: ((d: Date) => string) | undefined
  format?: 'RFC1738' | 'RFC3986' | undefined
  encodeValuesOnly?: boolean | undefined
  addQueryPrefix?: boolean | undefined
  charset?: 'utf-8' | 'iso-8859-1' | undefined
  charsetSentinel?: boolean | undefined
  allowEmptyArrays?: boolean | undefined
  commaRoundTrip?: boolean | undefined
}

// Dynamic options for stringify based on allowDots
export type IStringifyDynamicOptions<AllowDots extends BooleanOptional> = AllowDots extends true
  ? { allowDots?: AllowDots; encodeDotInKeys?: boolean }
  : { allowDots?: boolean; encodeDotInKeys?: false }

// Combined stringify options
export type IStringifyOptions<AllowDots extends BooleanOptional = undefined> =
  & IStringifyBaseOptions
  & IStringifyDynamicOptions<AllowDots>

// Base options for parse
export interface IParseBaseOptions {
  comma?: boolean | undefined
  delimiter?: string | RegExp | undefined
  depth?: number | false | undefined
  decoder?:
  | ((str: string, defaultDecoder: defaultDecoder, charset: string, type: 'key' | 'value') => any)
  | undefined
  arrayLimit?: number | undefined
  parseArrays?: boolean | undefined
  plainObjects?: boolean | undefined
  allowPrototypes?: boolean | undefined
  allowSparse?: boolean | undefined
  parameterLimit?: number | undefined
  strictNullHandling?: boolean | undefined
  ignoreQueryPrefix?: boolean | undefined
  charset?: 'utf-8' | 'iso-8859-1' | undefined
  charsetSentinel?: boolean | undefined
  interpretNumericEntities?: boolean | undefined
  allowEmptyArrays?: boolean | undefined
  duplicates?: 'combine' | 'first' | 'last' | undefined
  strictDepth?: boolean | undefined
  throwOnLimitExceeded?: boolean | undefined
}

// Dynamic options for parse based on allowDots
export type IParseDynamicOptions<AllowDots extends BooleanOptional> = AllowDots extends true
  ? { allowDots?: AllowDots; decodeDotInKeys?: boolean }
  : { allowDots?: boolean; decodeDotInKeys?: false }

// Combined parse options
export type IParseOptions<AllowDots extends BooleanOptional = undefined> =
  & IParseBaseOptions
  & IParseDynamicOptions<AllowDots>

// ParsedQs interface - the default return type for parse
export interface ParsedQs {
  [key: string]: undefined | string | ParsedQs | (string | ParsedQs)[]
}
