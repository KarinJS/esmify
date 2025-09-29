import * as utils from './utils'

const has = Object.prototype.hasOwnProperty
const isArray = Array.isArray

export interface ParseOptions {
  allowDots: boolean
  allowEmptyArrays: boolean
  allowPrototypes: boolean
  allowSparse: boolean
  arrayLimit: number
  charset: string
  charsetSentinel: boolean
  comma: boolean
  decodeDotInKeys: boolean
  decoder: (str: string, decoder?: any, charset?: string, type?: string) => any
  delimiter: string | RegExp
  depth: number | false
  duplicates: 'combine' | 'first' | 'last'
  ignoreQueryPrefix: boolean
  interpretNumericEntities: boolean
  parameterLimit: number
  parseArrays: boolean
  plainObjects: boolean
  strictDepth: boolean
  strictNullHandling: boolean
  throwOnLimitExceeded: boolean
}

const defaults: ParseOptions = {
  allowDots: false,
  allowEmptyArrays: false,
  allowPrototypes: false,
  allowSparse: false,
  arrayLimit: 20,
  charset: 'utf-8',
  charsetSentinel: false,
  comma: false,
  decodeDotInKeys: false,
  decoder: utils.decode,
  delimiter: '&',
  depth: 5,
  duplicates: 'combine',
  ignoreQueryPrefix: false,
  interpretNumericEntities: false,
  parameterLimit: 1000,
  parseArrays: true,
  plainObjects: false,
  strictDepth: false,
  strictNullHandling: false,
  throwOnLimitExceeded: false,
}

const interpretNumericEntities = (str: string): string => {
  return str.replace(/&#(\d+);/g, ($0: string, numberStr: string) => {
    return String.fromCharCode(parseInt(numberStr, 10))
  })
}

const parseArrayValue = (val: any, options: ParseOptions, currentArrayLength: number): any => {
  if (val && typeof val === 'string' && options.comma && val.indexOf(',') > -1) {
    return val.split(',')
  }

  if (options.throwOnLimitExceeded && currentArrayLength >= options.arrayLimit) {
    throw new RangeError('Array limit exceeded. Only ' + options.arrayLimit + ' element' + (options.arrayLimit === 1 ? '' : 's') + ' allowed in an array.')
  }

  return val
}

// This is what browsers will submit when the ✓ character occurs in an
// application/x-www-form-urlencoded body and the encoding of the page containing
// the form is iso-8859-1, or when the submitted form has an accept-charset
// attribute of iso-8859-1. Presumably also with other charsets that do not contain
// the ✓ character, such as us-ascii.
const isoSentinel = 'utf8=%26%2310003%3B' // encodeURIComponent('&#10003;')

// These are the percent-encoded utf-8 octets representing a checkmark, indicating that the request actually is utf-8 encoded.
const charsetSentinel = 'utf8=%E2%9C%93' // encodeURIComponent('✓')

const parseValues = (str: string, options: ParseOptions): Record<string, any> => {
  const obj = Object.create(null)

  const cleanStr = options.ignoreQueryPrefix ? str.replace(/^\?/, '') : str
  const cleanedStr = cleanStr.replace(/%5B/gi, '[').replace(/%5D/gi, ']')

  const limit = options.parameterLimit === Infinity ? undefined : options.parameterLimit
  const parts = cleanedStr.split(
    options.delimiter as string,
    options.throwOnLimitExceeded ? (limit ? limit + 1 : undefined) : limit
  )

  if (options.throwOnLimitExceeded && limit && parts.length > limit) {
    throw new RangeError('Parameter limit exceeded. Only ' + limit + ' parameter' + (limit === 1 ? '' : 's') + ' allowed.')
  }

  let skipIndex = -1 // Keep track of where the utf8 sentinel was found
  let i: number

  let charset = options.charset
  if (options.charsetSentinel) {
    for (i = 0; i < parts.length; ++i) {
      if (parts[i].indexOf('utf8=') === 0) {
        if (parts[i] === charsetSentinel) {
          charset = 'utf-8'
        } else if (parts[i] === isoSentinel) {
          charset = 'iso-8859-1'
        }
        skipIndex = i
        i = parts.length // The eslint settings do not allow break;
      }
    }
  }

  for (i = 0; i < parts.length; ++i) {
    if (i === skipIndex) {
      continue
    }
    const part = parts[i]

    const bracketEqualsPos = part.indexOf(']=')
    const pos = bracketEqualsPos === -1 ? part.indexOf('=') : bracketEqualsPos + 1

    let key: any
    let val: any
    if (pos === -1) {
      key = options.decoder(part, defaults.decoder, charset, 'key')
      val = options.strictNullHandling ? null : ''
    } else {
      key = options.decoder(part.slice(0, pos), defaults.decoder, charset, 'key')

      val = utils.maybeMap(
        parseArrayValue(
          part.slice(pos + 1),
          options,
          isArray(obj[key]) ? obj[key].length : 0
        ),
        (encodedVal: string) => {
          return options.decoder(encodedVal, defaults.decoder, charset, 'value')
        }
      )
    }

    if (val && options.interpretNumericEntities && charset === 'iso-8859-1') {
      val = interpretNumericEntities(String(val))
    }

    if (part.indexOf('[]=') > -1) {
      val = isArray(val) ? [val] : val
    }

    const existing = has.call(obj, key)
    if (existing && options.duplicates === 'combine') {
      obj[key] = utils.combine(obj[key], val)
    } else if (!existing || options.duplicates === 'last') {
      obj[key] = val
    }
  }

  return obj
}

const parseObject = (chain: string[], val: any, options: ParseOptions, valuesParsed?: boolean): any => {
  let currentArrayLength = 0
  if (chain.length > 0 && chain[chain.length - 1] === '[]') {
    const parentKey = chain.slice(0, -1).join('')
    currentArrayLength = Array.isArray(val) && (val as any)[parentKey] ? (val as any)[parentKey].length : 0
  }

  let leaf = valuesParsed ? val : parseArrayValue(val, options, currentArrayLength)

  for (let i = chain.length - 1; i >= 0; --i) {
    let obj: any
    const root = chain[i]

    if (root === '[]' && options.parseArrays) {
      obj = options.allowEmptyArrays && (leaf === '' || (options.strictNullHandling && leaf === null))
        ? []
        : utils.combine([], leaf)
    } else {
      obj = options.plainObjects ? Object.create(null) : {}
      const cleanRoot = root.charAt(0) === '[' && root.charAt(root.length - 1) === ']' ? root.slice(1, -1) : root
      const decodedRoot = options.decodeDotInKeys ? cleanRoot.replace(/%2E/g, '.') : cleanRoot
      const index = parseInt(decodedRoot, 10)
      if (!options.parseArrays && decodedRoot === '') {
        obj = { 0: leaf }
      } else if (
        !isNaN(index) &&
        root !== decodedRoot &&
        String(index) === decodedRoot &&
        index >= 0 &&
        (options.parseArrays && index <= options.arrayLimit)
      ) {
        obj = []
        obj[index] = leaf
      } else if (decodedRoot !== '__proto__') {
        obj[decodedRoot] = leaf
      }
    }

    leaf = obj
  }

  return leaf
}

const parseKeys = (givenKey: string, val: any, options: ParseOptions, valuesParsed?: boolean): any => {
  if (!givenKey) {
    return
  }

  // Transform dot notation to bracket notation
  const key = options.allowDots ? givenKey.replace(/\.([^.[]+)/g, '[$1]') : givenKey

  // The regex chunks

  const brackets = /(\[[^[\]]*])/
  const child = /(\[[^[\]]*])/g

  // Get the parent

  let segment = (typeof options.depth === 'number' && options.depth > 0) ? brackets.exec(key) : null
  const parent = segment ? key.slice(0, segment.index) : key

  // Stash the parent if it exists

  const keys: string[] = []
  if (parent) {
    // If we aren't using plain objects, optionally prefix keys that would overwrite object prototype properties
    if (!options.plainObjects && has.call(Object.prototype, parent)) {
      if (!options.allowPrototypes) {
        return
      }
    }

    keys.push(parent)
  }

  // Loop through children appending to the array until we hit depth

  let i = 0
  while ((typeof options.depth === 'number' && options.depth > 0) && (segment = child.exec(key)) !== null && (typeof options.depth === 'number' && i < options.depth)) {
    i += 1
    if (!options.plainObjects && has.call(Object.prototype, segment[1].slice(1, -1))) {
      if (!options.allowPrototypes) {
        return
      }
    }
    keys.push(segment[1])
  }

  // If there's a remainder, check strictDepth option for throw, else just add whatever is left

  if (segment) {
    if (options.strictDepth === true) {
      throw new RangeError('Input depth exceeded depth option of ' + options.depth + ' and strictDepth is true')
    }
    keys.push('[' + key.slice(segment.index) + ']')
  }

  return parseObject(keys, val, options, valuesParsed)
}

const normalizeParseOptions = (opts?: Partial<ParseOptions>): ParseOptions => {
  if (!opts) {
    return defaults
  }

  if (typeof opts.allowEmptyArrays !== 'undefined' && typeof opts.allowEmptyArrays !== 'boolean') {
    throw new TypeError('`allowEmptyArrays` option can only be `true` or `false`, when provided')
  }

  if (typeof opts.decodeDotInKeys !== 'undefined' && typeof opts.decodeDotInKeys !== 'boolean') {
    throw new TypeError('`decodeDotInKeys` option can only be `true` or `false`, when provided')
  }

  if (opts.decoder !== null && typeof opts.decoder !== 'undefined' && typeof opts.decoder !== 'function') {
    throw new TypeError('Decoder has to be a function.')
  }

  if (typeof opts.charset !== 'undefined' && opts.charset !== 'utf-8' && opts.charset !== 'iso-8859-1') {
    throw new TypeError('The charset option must be either utf-8, iso-8859-1, or undefined')
  }

  if (typeof opts.throwOnLimitExceeded !== 'undefined' && typeof opts.throwOnLimitExceeded !== 'boolean') {
    throw new TypeError('`throwOnLimitExceeded` option must be a boolean')
  }

  const charset = typeof opts.charset === 'undefined' ? defaults.charset : opts.charset

  const duplicates = typeof opts.duplicates === 'undefined' ? defaults.duplicates : opts.duplicates

  if (duplicates !== 'combine' && duplicates !== 'first' && duplicates !== 'last') {
    throw new TypeError('The duplicates option must be either combine, first, or last')
  }

  const allowDots = typeof opts.allowDots === 'undefined' ? opts.decodeDotInKeys === true ? true : defaults.allowDots : !!opts.allowDots

  return {
    allowDots,
    allowEmptyArrays: typeof opts.allowEmptyArrays === 'boolean' ? !!opts.allowEmptyArrays : defaults.allowEmptyArrays,
    allowPrototypes: typeof opts.allowPrototypes === 'boolean' ? opts.allowPrototypes : defaults.allowPrototypes,
    allowSparse: typeof opts.allowSparse === 'boolean' ? opts.allowSparse : defaults.allowSparse,
    arrayLimit: typeof opts.arrayLimit === 'number' ? opts.arrayLimit : defaults.arrayLimit,
    charset,
    charsetSentinel: typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults.charsetSentinel,
    comma: typeof opts.comma === 'boolean' ? opts.comma : defaults.comma,
    decodeDotInKeys: typeof opts.decodeDotInKeys === 'boolean' ? opts.decodeDotInKeys : defaults.decodeDotInKeys,
    decoder: typeof opts.decoder === 'function' ? opts.decoder : defaults.decoder,
    delimiter: typeof opts.delimiter === 'string' || utils.isRegExp(opts.delimiter) ? opts.delimiter : defaults.delimiter,
    depth: (typeof opts.depth === 'number' || opts.depth === false) ? Number(opts.depth) : defaults.depth,
    duplicates,
    ignoreQueryPrefix: opts.ignoreQueryPrefix === true,
    interpretNumericEntities: typeof opts.interpretNumericEntities === 'boolean' ? opts.interpretNumericEntities : defaults.interpretNumericEntities,
    parameterLimit: typeof opts.parameterLimit === 'number' ? opts.parameterLimit : defaults.parameterLimit,
    parseArrays: opts.parseArrays !== false,
    plainObjects: typeof opts.plainObjects === 'boolean' ? opts.plainObjects : defaults.plainObjects,
    strictDepth: typeof opts.strictDepth === 'boolean' ? !!opts.strictDepth : defaults.strictDepth,
    strictNullHandling: typeof opts.strictNullHandling === 'boolean' ? opts.strictNullHandling : defaults.strictNullHandling,
    throwOnLimitExceeded: typeof opts.throwOnLimitExceeded === 'boolean' ? opts.throwOnLimitExceeded : false,
  }
}

const parse = (str: string | Record<string, string>, opts?: Partial<ParseOptions>): any => {
  const options = normalizeParseOptions(opts)

  if (str === '' || str === null || typeof str === 'undefined') {
    return options.plainObjects ? Object.create(null) : {}
  }

  const tempObj = typeof str === 'string' ? parseValues(str, options) : str
  const obj = options.plainObjects ? Object.create(null) : {}

  // Iterate over the keys and setup the new object

  const keys = Object.keys(tempObj)
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i]
    const newObj = parseKeys(key, tempObj[key], options, typeof str === 'string')
    const merged = utils.merge(obj, newObj, options)
    Object.assign(obj, merged)
  }

  if (options.allowSparse === true) {
    return obj
  }

  return utils.compact(obj)
}

export default parse
