/* eslint no-underscore-dangle: ["error", { "allow": ["__statusCode", "_remoteAddress", "__headers", "_logging"] }] */

import Level from './levels'
import type { HttpRequest, HttpResponse } from './types/core'

const DEFAULT_FORMAT =
  ':remote-addr - -' +
  ' ":method :url HTTP/:http-version"' +
  ' :status :content-length ":referrer"' +
  ' ":user-agent"'

interface Token {
  token: string | RegExp
  replacement: string | number | ((match: string, field?: string) => string)
}

interface StatusRule {
  from?: number
  to?: number
  codes?: number[]
  level: string
}

interface ConnectLoggerOptions {
  format?: string | ((req: HttpRequest, res: HttpResponse, formatter: (str: string) => string) => string)
  level?: string
  nolog?: string | RegExp | string[] | ((req: HttpRequest, res: HttpResponse) => boolean)
  statusRules?: StatusRule[]
  context?: boolean
  tokens?: Token[]
}

/**
 * Return request url path,
 * adding this function prevents the Cyclomatic Complexity,
 * for the assemble_tokens function at low, to pass the tests.
 *
 * @param  req
 * @return string
 * @api private
 */
function getUrl (req: HttpRequest): string {
  return req.originalUrl || req.url || ''
}

/**
 * Adds custom {token, replacement} objects to defaults,
 * overwriting the defaults if any tokens clash
 *
 * @param  req
 * @param  res
 * @param  customTokens
 *    [{ token: string-or-regexp, replacement: string-or-replace-function }]
 * @return Array
 */
function assembleTokens (req: HttpRequest, res: HttpResponse, customTokens: Token[]): Token[] {
  const arrayUniqueTokens = (array: Token[]): Token[] => {
    const a = array.concat()
    for (let i = 0; i < a.length; ++i) {
      for (let j = i + 1; j < a.length; ++j) {
        // not === because token can be regexp object
        // eslint-disable-next-line eqeqeq
        if (a[i].token == a[j].token) {
          a.splice(j--, 1)
        }
      }
    }
    return a
  }

  const defaultTokens: Token[] = []
  defaultTokens.push({ token: ':url', replacement: getUrl(req) })
  defaultTokens.push({ token: ':protocol', replacement: req.protocol || '' })
  defaultTokens.push({ token: ':hostname', replacement: req.hostname || '' })
  defaultTokens.push({ token: ':method', replacement: req.method || '' })
  defaultTokens.push({
    token: ':status',
    replacement: res.__statusCode || res.statusCode || 0,
  })
  defaultTokens.push({
    token: ':response-time',
    replacement: res.responseTime || 0,
  })
  defaultTokens.push({ token: ':date', replacement: new Date().toUTCString() })
  defaultTokens.push({
    token: ':referrer',
    replacement: String((req.headers?.referer || req.headers?.referrer || '')).split(',')[0] || '',
  })
  defaultTokens.push({
    token: ':http-version',
    replacement: `${req.httpVersionMajor || 1}.${req.httpVersionMinor || 0}`,
  })
  defaultTokens.push({
    token: ':remote-addr',
    replacement: String(
      req.headers?.['x-forwarded-for'] ||
      req.ip ||
      req._remoteAddress ||
      req.socket?.remoteAddress ||
      req.socket?.socket?.remoteAddress ||
      ''
    ).split(',')[0] || '',
  })
  defaultTokens.push({
    token: ':user-agent',
    replacement: String(req.headers?.['user-agent'] || ''),
  })
  defaultTokens.push({
    token: ':content-length',
    replacement: String(
      res.getHeader?.('content-length') ||
      res.__headers?.['Content-Length'] ||
      '-'
    ),
  })
  defaultTokens.push({
    token: /:req\[([^\]]+)]/g,
    replacement (_, field) {
      return field ? String(req.headers?.[field.toLowerCase()] || '') : ''
    },
  })
  defaultTokens.push({
    token: /:res\[([^\]]+)]/g,
    replacement (_, field) {
      return field
        ? String(res.getHeader?.(field.toLowerCase()) || res.__headers?.[field] || '')
        : ''
    },
  })

  return arrayUniqueTokens(customTokens.concat(defaultTokens))
}

/**
 * Return formatted log line.
 *
 * @param  str
 * @param tokens
 * @return string
 * @api private
 */
function format (str: string, tokens: Token[]): string {
  for (let i = 0; i < tokens.length; i++) {
    str = str.replace(tokens[i].token, tokens[i].replacement as string)
  }
  return str
}

/**
 * Return RegExp Object about nolog
 *
 * @param  nolog
 * @return RegExp
 * @api private
 *
 * syntax
 *  1. String
 *   1.1 "\\.gif"
 *         NOT LOGGING http://example.com/hoge.gif and http://example.com/hoge.gif?fuga
 *         LOGGING http://example.com/hoge.agif
 *   1.2 in "\\.gif|\\.jpg$"
 *         NOT LOGGING http://example.com/hoge.gif and
 *           http://example.com/hoge.gif?fuga and http://example.com/hoge.jpg?fuga
 *         LOGGING http://example.com/hoge.agif,
 *           http://example.com/hoge.ajpg and http://example.com/hoge.jpg?hoge
 *   1.3 in "\\.(gif|jpe?g|png)$"
 *         NOT LOGGING http://example.com/hoge.gif and http://example.com/hoge.jpeg
 *         LOGGING http://example.com/hoge.gif?uid=2 and http://example.com/hoge.jpg?pid=3
 *  2. RegExp
 *   2.1 in /\.(gif|jpe?g|png)$/
 *         SAME AS 1.3
 *  3. Array
 *   3.1 ["\\.jpg$", "\\.png", "\\.gif"]
 *         SAME AS "\\.jpg|\\.png|\\.gif"
 */
function createNoLogCondition (nolog?: string | RegExp | string[]): RegExp | null {
  let regexp: RegExp | null = null

  if (nolog instanceof RegExp) {
    regexp = nolog
  }

  if (typeof nolog === 'string') {
    regexp = new RegExp(nolog)
  }

  if (Array.isArray(nolog)) {
    // convert to strings
    const regexpsAsStrings = nolog.map((reg: string | RegExp) =>
      typeof reg === 'object' && reg.source ? reg.source : String(reg)
    )
    regexp = new RegExp(regexpsAsStrings.join('|'))
  }

  return regexp
}

/**
 * Allows users to define rules around status codes to assign them to a specific
 * logging level.
 * There are two types of rules:
 *   - RANGE: matches a code within a certain range
 *     E.g. { 'from': 200, 'to': 299, 'level': 'info' }
 *   - CONTAINS: matches a code to a set of expected codes
 *     E.g. { 'codes': [200, 203], 'level': 'debug' }
 * Note*: Rules are respected only in order of prescendence.
 *
 * @param statusCode
 * @param currentLevel
 * @param ruleSet
 * @return Level
 * @api private
 */
function matchRules (statusCode: number, currentLevel: Level, ruleSet?: StatusRule[]): Level {
  let level = currentLevel

  if (ruleSet) {
    const matchedRule = ruleSet.find((rule) => {
      let ruleMatched = false
      if (rule.from && rule.to) {
        ruleMatched = statusCode >= rule.from && statusCode <= rule.to
      } else if (rule.codes) {
        ruleMatched = rule.codes.indexOf(statusCode) !== -1
      }
      return ruleMatched
    })
    if (matchedRule) {
      level = Level.getLevel(matchedRule.level, level)!
    }
  }
  return level
}

/**
 * Log requests with the given `options` or a `format` string.
 *
 * Options:
 *
 *   - `format`        Format string, see below for tokens
 *   - `level`         A log4js levels instance. Supports also 'auto'
 *   - `nolog`         A string or RegExp to exclude target logs or function(req, res): boolean
 *   - `statusRules`   A array of rules for setting specific logging levels base on status codes
 *   - `context`       Whether to add a response of express to the context
 *
 * Tokens:
 *
 *   - `:req[header]` ex: `:req[Accept]`
 *   - `:res[header]` ex: `:res[Content-Length]`
 *   - `:http-version`
 *   - `:response-time`
 *   - `:remote-addr`
 *   - `:date`
 *   - `:method`
 *   - `:url`
 *   - `:referrer`
 *   - `:user-agent`
 *   - `:status`
 *
 * @return Function
 * @param logger4js
 * @param options
 * @api public
 */
interface Logger4js {
  isLevelEnabled: (level: Level) => boolean
  log: (level: Level, ...args: unknown[]) => void
  addContext: (key: string, value: unknown) => void
  removeContext: (key: string) => void
}

export default function getLogger (logger4js: Logger4js, options?: ConnectLoggerOptions | string | ((req: HttpRequest, res: HttpResponse, formatter: (str: string) => string) => string)): (req: HttpRequest, res: HttpResponse, next: () => void) => void {
  let opts: ConnectLoggerOptions
  if (typeof options === 'string' || typeof options === 'function') {
    opts = { format: options }
  } else {
    opts = options || {}
  }

  const thisLogger = logger4js
  let level = Level.getLevel(opts.level, Level.getLevel('INFO')!)!
  const fmt = opts.format || DEFAULT_FORMAT

  return (req: HttpRequest, res: HttpResponse, next: () => void): void => {
    // mount safety
    if (typeof req._logging !== 'undefined') return next()

    // nologs
    if (typeof opts.nolog !== 'function') {
      const nolog = createNoLogCondition(opts.nolog as string | RegExp | string[])
      if (nolog && nolog.test(req.originalUrl || '')) return next()
    }

    if (thisLogger.isLevelEnabled(level) || opts.level === 'auto') {
      const start = new Date()
      const { writeHead } = res

      // flag as logging
      req._logging = true

      // proxy for statusCode.
      res.writeHead = (code: number, headers?: Record<string, string | string[] | number>): HttpResponse => {
        res.writeHead = writeHead
        if (writeHead) {
          writeHead.call(res, code, headers)
        }

        res.__statusCode = code
        res.__headers = headers || {}
        return res
      }

      // hook on end request to emit the log entry of the HTTP request.
      let finished = false
      const handler = (): void => {
        if (finished) {
          return
        }
        finished = true

        // nologs
        if (typeof opts.nolog === 'function') {
          if (opts.nolog(req, res) === true) {
            req._logging = false
            return
          }
        }

        res.responseTime = Number(new Date()) - Number(start)
        // status code response level handling
        if (res.statusCode && opts.level === 'auto') {
          level = Level.getLevel('INFO')!
          if (res.statusCode >= 300) level = Level.getLevel('WARN')!
          if (res.statusCode >= 400) level = Level.getLevel('ERROR')!
        }
        level = matchRules(res.statusCode || 0, level, opts.statusRules)

        const combinedTokens = assembleTokens(req, res, opts.tokens || [])

        if (opts.context) thisLogger.addContext('res', res)
        if (typeof fmt === 'function') {
          const line = fmt(req, res, (str: string) => format(str, combinedTokens))
          if (line) thisLogger.log(level, line)
        } else {
          thisLogger.log(level, format(fmt as string, combinedTokens))
        }
        if (opts.context) thisLogger.removeContext('res')
      }
      if (res.on) {
        res.on('end', handler)
        res.on('finish', handler)
        res.on('error', handler)
        res.on('close', handler)
      }
    }

    // ensure next gets always called
    return next()
  }
}
