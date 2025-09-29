import getSideChannel from 'side-channel'
import * as utils from './utils'
import formats, { FormatType } from './formats'

const has = Object.prototype.hasOwnProperty

const arrayPrefixGenerators = {
  brackets: (prefix: string): string => {
    return prefix + '[]'
  },
  comma: 'comma' as const,
  indices: (prefix: string, key: string): string => {
    return prefix + '[' + key + ']'
  },
  repeat: (prefix: string): string => {
    return prefix
  },
}

const isArray = Array.isArray
const push = Array.prototype.push
const pushToArray = (arr: any[], valueOrArray: any): void => {
  push.apply(arr, isArray(valueOrArray) ? valueOrArray : [valueOrArray])
}

const toISO = Date.prototype.toISOString

const defaultFormat = formats.default

export interface StringifyOptions {
  addQueryPrefix: boolean
  allowDots: boolean
  allowEmptyArrays: boolean
  arrayFormat: 'indices' | 'brackets' | 'repeat' | 'comma'
  charset: string
  charsetSentinel: boolean
  commaRoundTrip: boolean
  delimiter: string
  encode: boolean
  encodeDotInKeys: boolean
  encoder: (str: any, defaultEncoder: any, charset: string, type: string, format: FormatType) => string
  encodeValuesOnly: boolean
  filter: any
  format: FormatType
  formatter: (value: string) => string
  indices: boolean
  serializeDate: (date: Date) => string
  skipNulls: boolean
  strictNullHandling: boolean
  sort?: ((a: string, b: string) => number) | null
}

const defaults: StringifyOptions = {
  addQueryPrefix: false,
  allowDots: false,
  allowEmptyArrays: false,
  arrayFormat: 'indices',
  charset: 'utf-8',
  charsetSentinel: false,
  commaRoundTrip: false,
  delimiter: '&',
  encode: true,
  encodeDotInKeys: false,
  encoder: utils.encode,
  encodeValuesOnly: false,
  filter: undefined,
  format: defaultFormat,
  formatter: formats.formatters[defaultFormat],
  // deprecated
  indices: false,
  serializeDate: (date: Date): string => {
    return toISO.call(date)
  },
  skipNulls: false,
  strictNullHandling: false,
}

const isNonNullishPrimitive = (v: any): boolean => {
  return typeof v === 'string' ||
    typeof v === 'number' ||
    typeof v === 'boolean' ||
    typeof v === 'symbol' ||
    typeof v === 'bigint'
}

const sentinel = {}

const stringify = (
  object: any,
  prefix: string,
  generateArrayPrefix: any,
  commaRoundTrip: boolean,
  allowEmptyArrays: boolean,
  strictNullHandling: boolean,
  skipNulls: boolean,
  encodeDotInKeys: boolean,
  encoder: any,
  filter: any,
  sort: any,
  allowDots: boolean,
  serializeDate: (date: Date) => string,
  format: FormatType,
  formatter: (value: string) => string,
  encodeValuesOnly: boolean,
  charset: string,
  sideChannel: any
): string[] => {
  let obj = object

  let tmpSc = sideChannel
  let step = 0
  let findFlag = false
  while ((tmpSc = tmpSc.get(sentinel)) !== undefined && !findFlag) {
    // Where object last appeared in the ref tree
    const pos = tmpSc.get(object)
    step += 1
    if (typeof pos !== 'undefined') {
      if (pos === step) {
        throw new RangeError('Cyclic object value')
      } else {
        findFlag = true // Break while
      }
    }
    if (typeof tmpSc.get(sentinel) === 'undefined') {
      step = 0
    }
  }

  if (typeof filter === 'function') {
    obj = filter(prefix, obj)
  } else if (obj instanceof Date) {
    obj = serializeDate(obj)
  } else if (generateArrayPrefix === 'comma' && isArray(obj)) {
    obj = utils.maybeMap(obj, (value: any) => {
      if (value instanceof Date) {
        return serializeDate(value)
      }
      return value
    })
  }

  if (obj === null) {
    if (strictNullHandling) {
      return encoder && !encodeValuesOnly ? [encoder(prefix, defaults.encoder, charset, 'key', format)] : [prefix]
    }

    obj = ''
  }

  if (isNonNullishPrimitive(obj) || utils.isBuffer(obj)) {
    if (encoder) {
      const keyValue = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder, charset, 'key', format)
      return [formatter(keyValue) + '=' + formatter(encoder(obj, defaults.encoder, charset, 'value', format))]
    }
    return [formatter(prefix) + '=' + formatter(String(obj))]
  }

  const values: string[] = []

  if (typeof obj === 'undefined') {
    return values
  }

  let objKeys: any[]
  if (generateArrayPrefix === 'comma' && isArray(obj)) {
    // we need to join elements in
    if (encodeValuesOnly && encoder) {
      obj = utils.maybeMap(obj, encoder)
    }
    objKeys = [{ value: obj.length > 0 ? obj.join(',') || null : undefined }]
  } else if (isArray(filter)) {
    objKeys = filter
  } else {
    const keys = Object.keys(obj)
    objKeys = sort ? keys.sort(sort) : keys
  }

  const encodedPrefix = encodeDotInKeys ? String(prefix).replace(/\./g, '%2E') : String(prefix)

  const adjustedPrefix = commaRoundTrip && isArray(obj) && obj.length === 1 ? encodedPrefix + '[]' : encodedPrefix

  if (allowEmptyArrays && isArray(obj) && obj.length === 0) {
    return [adjustedPrefix + '[]']
  }

  for (let j = 0; j < objKeys.length; ++j) {
    const key = objKeys[j]
    const value = typeof key === 'object' && key && typeof key.value !== 'undefined'
      ? key.value
      : obj[key]

    if (skipNulls && value === null) {
      continue
    }

    const encodedKey = allowDots && encodeDotInKeys ? String(key).replace(/\./g, '%2E') : String(key)
    const keyPrefix = isArray(obj)
      ? typeof generateArrayPrefix === 'function' ? generateArrayPrefix(adjustedPrefix, encodedKey) : adjustedPrefix
      : adjustedPrefix + (allowDots ? '.' + encodedKey : '[' + encodedKey + ']')

    sideChannel.set(object, step)
    const valueSideChannel = getSideChannel()
    valueSideChannel.set(sentinel, sideChannel)
    pushToArray(values, stringify(
      value,
      keyPrefix,
      generateArrayPrefix,
      commaRoundTrip,
      allowEmptyArrays,
      strictNullHandling,
      skipNulls,
      encodeDotInKeys,
      generateArrayPrefix === 'comma' && encodeValuesOnly && isArray(obj) ? null : encoder,
      filter,
      sort,
      allowDots,
      serializeDate,
      format,
      formatter,
      encodeValuesOnly,
      charset,
      valueSideChannel
    ))
  }

  return values
}

const normalizeStringifyOptions = (opts?: Partial<StringifyOptions>): StringifyOptions => {
  if (!opts) {
    return defaults
  }

  if (typeof opts.allowEmptyArrays !== 'undefined' && typeof opts.allowEmptyArrays !== 'boolean') {
    throw new TypeError('`allowEmptyArrays` option can only be `true` or `false`, when provided')
  }

  if (typeof opts.encodeDotInKeys !== 'undefined' && typeof opts.encodeDotInKeys !== 'boolean') {
    throw new TypeError('`encodeDotInKeys` option can only be `true` or `false`, when provided')
  }

  if (opts.encoder !== null && typeof opts.encoder !== 'undefined' && typeof opts.encoder !== 'function') {
    throw new TypeError('Encoder has to be a function.')
  }

  const charset = opts.charset || defaults.charset
  if (typeof opts.charset !== 'undefined' && opts.charset !== 'utf-8' && opts.charset !== 'iso-8859-1') {
    throw new TypeError('The charset option must be either utf-8, iso-8859-1, or undefined')
  }

  let format: FormatType = formats.default
  if (typeof opts.format !== 'undefined') {
    if (!has.call(formats.formatters, opts.format)) {
      throw new TypeError('Unknown format option provided.')
    }
    format = opts.format
  }
  const formatter = formats.formatters[format]

  let filter = defaults.filter
  if (typeof opts.filter === 'function' || isArray(opts.filter)) {
    filter = opts.filter
  }

  let arrayFormat: 'indices' | 'brackets' | 'repeat' | 'comma'
  if (opts.arrayFormat && opts.arrayFormat in arrayPrefixGenerators) {
    arrayFormat = opts.arrayFormat
  } else if ('indices' in opts) {
    arrayFormat = opts.indices ? 'indices' : 'repeat'
  } else {
    arrayFormat = defaults.arrayFormat
  }

  if ('commaRoundTrip' in opts && typeof opts.commaRoundTrip !== 'boolean') {
    throw new TypeError('`commaRoundTrip` must be a boolean, or absent')
  }

  const allowDots = typeof opts.allowDots === 'undefined' ? opts.encodeDotInKeys === true : !!opts.allowDots

  return {
    addQueryPrefix: typeof opts.addQueryPrefix === 'boolean' ? opts.addQueryPrefix : defaults.addQueryPrefix,
    allowDots,
    allowEmptyArrays: typeof opts.allowEmptyArrays === 'boolean' ? !!opts.allowEmptyArrays : defaults.allowEmptyArrays,
    arrayFormat,
    charset,
    charsetSentinel: typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults.charsetSentinel,
    commaRoundTrip: !!opts.commaRoundTrip,
    delimiter: typeof opts.delimiter === 'undefined' ? defaults.delimiter : opts.delimiter,
    encode: typeof opts.encode === 'boolean' ? opts.encode : defaults.encode,
    encodeDotInKeys: typeof opts.encodeDotInKeys === 'boolean' ? opts.encodeDotInKeys : defaults.encodeDotInKeys,
    encoder: typeof opts.encoder === 'function' ? opts.encoder : defaults.encoder,
    encodeValuesOnly: typeof opts.encodeValuesOnly === 'boolean' ? opts.encodeValuesOnly : defaults.encodeValuesOnly,
    filter,
    format,
    formatter,
    serializeDate: typeof opts.serializeDate === 'function' ? opts.serializeDate : defaults.serializeDate,
    skipNulls: typeof opts.skipNulls === 'boolean' ? opts.skipNulls : defaults.skipNulls,
    sort: typeof opts.sort === 'function' ? opts.sort : null,
    strictNullHandling: typeof opts.strictNullHandling === 'boolean' ? opts.strictNullHandling : defaults.strictNullHandling,
    indices: defaults.indices,
  }
}

const stringifyFn = (object: any, opts?: Partial<StringifyOptions>): string => {
  let obj = object
  const options = normalizeStringifyOptions(opts)

  let objKeys: string[]
  let filter: any

  if (typeof options.filter === 'function') {
    filter = options.filter
    obj = filter('', obj)
  } else if (isArray(options.filter)) {
    filter = options.filter
    objKeys = filter
  }

  const keys: string[] = []

  if (typeof obj !== 'object' || obj === null) {
    return ''
  }

  const generateArrayPrefix = arrayPrefixGenerators[options.arrayFormat]
  const commaRoundTrip = generateArrayPrefix === 'comma' && options.commaRoundTrip

  if (!objKeys!) {
    objKeys = Object.keys(obj)
  }

  if (options.sort) {
    objKeys.sort(options.sort)
  }

  const sideChannel = getSideChannel()
  for (let i = 0; i < objKeys.length; ++i) {
    const key = objKeys[i]
    const value = obj[key]

    if (options.skipNulls && value === null) {
      continue
    }
    pushToArray(keys, stringify(
      value,
      key,
      generateArrayPrefix,
      commaRoundTrip,
      options.allowEmptyArrays,
      options.strictNullHandling,
      options.skipNulls,
      options.encodeDotInKeys,
      options.encode ? options.encoder : null,
      options.filter,
      options.sort,
      options.allowDots,
      options.serializeDate,
      options.format,
      options.formatter,
      options.encodeValuesOnly,
      options.charset,
      sideChannel
    ))
  }

  const joined = keys.join(options.delimiter)
  let prefix = options.addQueryPrefix === true ? '?' : ''

  if (options.charsetSentinel) {
    if (options.charset === 'iso-8859-1') {
      // encodeURIComponent('&#10003;'), the "numeric entity" representation of a checkmark
      prefix += 'utf8=%26%2310003%3B&'
    } else {
      // encodeURIComponent('✓')
      prefix += 'utf8=%E2%9C%93&'
    }
  }

  return joined.length > 0 ? prefix + joined : ''
}

export default stringifyFn
