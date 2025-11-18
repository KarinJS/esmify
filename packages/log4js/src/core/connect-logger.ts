/**
 * Connect/Express 日志中间件
 * 用于记录 HTTP 请求和响应信息
 */

import { levels } from './levels'

import type { Level } from './levels'
import type { IncomingMessage, ServerResponse } from 'http'

/** HTTP 请求对象接口（扩展了 IncomingMessage） */
interface Request extends IncomingMessage {
  /** 原始 URL */
  originalUrl?: string
  /** 协议（http/https） */
  protocol?: string
  /** 主机名 */
  hostname?: string
  /** IP 地址 */
  ip?: string
  /** 远程地址 */
  _remoteAddress?: string
  /** 日志标记 */
  _logging?: boolean
  /** HTTP 主版本号 */
  httpVersionMajor: number
  /** HTTP 次版本号 */
  httpVersionMinor: number
  /** Socket 连接 */
  socket: any
}

/** HTTP 响应对象接口（扩展了 ServerResponse） */
interface Response extends ServerResponse {
  /** 状态码（用于代理） */
  __statusCode?: number
  /** 响应头（用于代理） */
  __headers?: Record<string, string>
  /** 响应时间（毫秒） */
  responseTime?: number
}

/** 令牌替换对象接口 */
interface Token {
  /** 令牌标识（字符串或正则表达式） */
  token: string | RegExp
  /** 替换内容（字符串或替换函数） */
  replacement: string | ((...args: any[]) => string)
}

/** 状态码规则接口（范围类型） */
interface RangeRule {
  /** 起始状态码 */
  from: number
  /** 结束状态码 */
  to: number
  /** 日志级别 */
  level: string
}

/** 状态码规则接口（包含类型） */
interface CodesRule {
  /** 状态码列表 */
  codes: number[]
  /** 日志级别 */
  level: string
}

/** 状态码规则类型 */
type StatusRule = RangeRule | CodesRule

/** 格式化函数类型 */
type FormatFunction = (
  req: Request,
  res: Response,
  formatter: (str: string) => string
) => string

/** 日志过滤函数类型 */
type NoLogFunction = (req: Request, res: Response) => boolean

/** 连接日志选项接口 */
interface ConnectLoggerOptions {
  /** 日志格式（字符串或格式化函数） */
  format?: string | FormatFunction
  /** 日志级别（Level 实例或 'auto'） */
  level?: Level | string
  /** 不记录日志的条件（字符串、正则表达式、数组或函数） */
  nolog?: string | RegExp | Array<string | RegExp> | NoLogFunction
  /** 状态码规则数组 */
  statusRules?: StatusRule[]
  /** 是否将响应对象添加到上下文 */
  context?: boolean
  /** 自定义令牌数组 */
  tokens?: Token[]
}

/** 日志记录器接口 */
interface Logger {
  /** 记录日志 */
  log: (level: Level, message: string) => void
  /** 判断是否启用指定级别 */
  isLevelEnabled: (level: Level) => boolean
  /** 添加上下文 */
  addContext: (key: string, value: any) => void
  /** 移除上下文 */
  removeContext: (key: string) => void
}

/** 默认日志格式 */
const DEFAULT_FORMAT =
  ':remote-addr - -' +
  ' ":method :url HTTP/:http-version"' +
  ' :status :content-length ":referrer"' +
  ' ":user-agent"'

/**
 * 获取请求 URL 路径
 * 添加此函数可以降低 assembleTokens 函数的圈复杂度，以通过测试
 *
 * @param req - HTTP 请求对象
 * @returns URL 路径
 */
function getUrl (req: Request): string {
  return req.originalUrl || req.url!
}

/**
 * 组装令牌数组
 * 将自定义令牌与默认令牌合并，如果有冲突则覆盖默认令牌
 *
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @param customTokens - 自定义令牌数组
 * @returns 令牌数组
 */
function assembleTokens (
  req: Request,
  res: Response,
  customTokens: Token[]
): Token[] {
  /**
   * 数组去重（根据 token 属性）
   * @param array - 令牌数组
   * @returns 去重后的令牌数组
   */
  const arrayUniqueTokens = (array: Token[]): Token[] => {
    const a = array.concat()
    for (let i = 0; i < a.length; ++i) {
      for (let j = i + 1; j < a.length; ++j) {
        // 不使用 === 因为 token 可以是正则对象
        // eslint-disable-next-line eqeqeq
        if (a[i].token == a[j].token) {
          a.splice(j--, 1) // eslint-disable-line no-plusplus
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
    replacement: String(res.__statusCode || res.statusCode),
  })
  defaultTokens.push({
    token: ':response-time',
    replacement: String(res.responseTime || ''),
  })
  defaultTokens.push({ token: ':date', replacement: new Date().toUTCString() })
  defaultTokens.push({
    token: ':referrer',
    replacement: String(req.headers.referer || req.headers.referrer || ''),
  })
  defaultTokens.push({
    token: ':http-version',
    replacement: `${req.httpVersionMajor}.${req.httpVersionMinor}`,
  })
  defaultTokens.push({
    token: ':remote-addr',
    replacement:
      req.headers['x-forwarded-for'] ||
      req.ip ||
      req._remoteAddress ||
      (req.socket &&
        (req.socket.remoteAddress ||
          (req.socket.socket && req.socket.socket.remoteAddress))) ||
      '',
  })
  defaultTokens.push({
    token: ':user-agent',
    replacement: req.headers['user-agent'] || '',
  })
  defaultTokens.push({
    token: ':content-length',
    replacement: String(
      res.getHeader('content-length') ||
      (res.__headers && res.__headers['Content-Length']) ||
      '-'
    ),
  })
  defaultTokens.push({
    token: /:req\[([^\]]+)]/g,
    replacement (_: string, field: string) {
      return String(req.headers[field.toLowerCase()] || '')
    },
  })
  defaultTokens.push({
    token: /:res\[([^\]]+)]/g,
    replacement (_: string, field: string) {
      return String(
        res.getHeader(field.toLowerCase()) ||
        (res.__headers && res.__headers[field]) ||
        ''
      )
    },
  })

  return arrayUniqueTokens(customTokens.concat(defaultTokens))
}

/**
 * 格式化日志行
 *
 * @param str - 格式字符串
 * @param tokens - 令牌数组
 * @returns 格式化后的日志行
 */
function format (str: string, tokens: Token[]): string {
  for (let i = 0; i < tokens.length; i++) {
    str = str.replace(
      tokens[i].token,
      tokens[i].replacement as string
    )
  }
  return str
}

/**
 * 创建不记录日志的条件（正则表达式）
 *
 * @param nolog - 不记录日志的条件
 * @returns 正则表达式
 *
 * 语法：
 *  1. 字符串
 *   1.1 "\\.gif"
 *         不记录：http://example.com/hoge.gif 和 http://example.com/hoge.gif?fuga
 *         记录：http://example.com/hoge.agif
 *   1.2 "\\.gif|\\.jpg$"
 *         不记录：http://example.com/hoge.gif、
 *           http://example.com/hoge.gif?fuga 和 http://example.com/hoge.jpg?fuga
 *         记录：http://example.com/hoge.agif、
 *           http://example.com/hoge.ajpg 和 http://example.com/hoge.jpg?hoge
 *   1.3 "\\.(gif|jpe?g|png)$"
 *         不记录：http://example.com/hoge.gif 和 http://example.com/hoge.jpeg
 *         记录：http://example.com/hoge.gif?uid=2 和 http://example.com/hoge.jpg?pid=3
 *  2. 正则表达式
 *   2.1 /\.(gif|jpe?g|png)$/
 *         与 1.3 相同
 *  3. 数组
 *   3.1 ["\\.jpg$", "\\.png", "\\.gif"]
 *         与 "\\.jpg|\\.png|\\.gif" 相同
 */
function createNoLogCondition (
  nolog: string | RegExp | Array<string | RegExp>
): RegExp | null {
  let regexp: RegExp | null = null

  if (nolog instanceof RegExp) {
    regexp = nolog
  }

  if (typeof nolog === 'string') {
    regexp = new RegExp(nolog)
  }

  if (Array.isArray(nolog)) {
    // 转换为字符串
    const regexpsAsStrings = nolog.map((reg) =>
      reg instanceof RegExp ? reg.source : reg
    )
    regexp = new RegExp(regexpsAsStrings.join('|'))
  }

  return regexp
}

/**
 * 根据状态码匹配规则，确定日志级别
 * 允许用户定义规则，将状态码分配到特定的日志级别
 * 支持两种类型的规则：
 *   - 范围规则（RANGE）：匹配某个范围内的状态码
 *     例如：{ 'from': 200, 'to': 299, 'level': 'info' }
 *   - 包含规则（CONTAINS）：匹配一组预期的状态码
 *     例如：{ 'codes': [200, 203], 'level': 'debug' }
 * 注意：规则仅按优先级顺序生效
 *
 * @param statusCode - HTTP 状态码
 * @param currentLevel - 当前日志级别
 * @param ruleSet - 规则集
 * @returns 匹配后的日志级别
 */
function matchRules (
  statusCode: number,
  currentLevel: Level,
  ruleSet?: StatusRule[]
): Level {
  let level = currentLevel

  if (ruleSet) {
    const matchedRule = ruleSet.find((rule) => {
      let ruleMatched = false
      if ('from' in rule && 'to' in rule) {
        ruleMatched = statusCode >= rule.from && statusCode <= rule.to
      } else if ('codes' in rule) {
        ruleMatched = rule.codes.indexOf(statusCode) !== -1
      }
      return ruleMatched
    })
    if (matchedRule) {
      level = levels.getLevel(matchedRule.level, level)
    }
  }
  return level
}

function getLogger (
  logger4js: Logger,
  options?: string | FormatFunction | ConnectLoggerOptions
) {
  if (typeof options === 'string' || typeof options === 'function') {
    options = { format: options }
  } else {
    options = options || {}
  }

  const thisLogger = logger4js
  let level = levels.getLevel(options.level, levels.INFO)
  const fmt = options.format || DEFAULT_FORMAT

  return (
    req: Request,
    res: Response,
    next: (err?: any) => void
  ) => {
    // 挂载安全检查
    if (typeof req._logging !== 'undefined') return next()

    // 不记录日志的情况
    if (typeof options!.nolog !== 'function') {
      const nolog = createNoLogCondition(
        options!.nolog as string | RegExp | Array<string | RegExp>
      )
      if (nolog && req.originalUrl && nolog.test(req.originalUrl)) {
        return next()
      }
    }

    if (thisLogger.isLevelEnabled(level) || options!.level === 'auto') {
      const start = new Date()
      const { writeHead } = res

      // 标记为正在记录日志
      req._logging = true

      // 代理 statusCode
      res.writeHead = (code: number, headers?: any) => {
        res.writeHead = writeHead
        res.writeHead(code, headers)

        res.__statusCode = code
        res.__headers = headers || {}
        return res
      }

      // 在请求结束时记录 HTTP 请求的日志条目
      let finished = false
      const handler = () => {
        if (finished) {
          return
        }
        finished = true

        // 不记录日志的情况（函数形式）
        if (typeof options!.nolog === 'function') {
          if (options!.nolog(req, res) === true) {
            req._logging = false
            return
          }
        }

        res.responseTime = Number(new Date()) - Number(start)
        // 状态码响应级别处理
        if (res.statusCode && options!.level === 'auto') {
          level = levels.INFO
          if (res.statusCode >= 300) level = levels.WARN
          if (res.statusCode >= 400) level = levels.ERROR
        }
        level = matchRules(res.statusCode, level, options!.statusRules)

        const combinedTokens = assembleTokens(req, res, options!.tokens || [])

        if (options!.context) thisLogger.addContext('res', res)
        if (typeof fmt === 'function') {
          const line = fmt(req, res, (str) => format(str, combinedTokens))
          if (line) thisLogger.log(level, line)
        } else {
          thisLogger.log(level, format(fmt, combinedTokens))
        }
        if (options!.context) thisLogger.removeContext('res')
      }
      res.on('end', handler)
      res.on('finish', handler)
      res.on('error', handler)
      res.on('close', handler)
    }

    // 确保始终调用 next
    return next()
  }
}

export const connectLogger = getLogger

export type { FormatFunction, ConnectLoggerOptions, Request, Response, Logger }
