import os from 'os'
import url from 'url'
import util from 'util'
import path from 'path'
import DEBUG from 'debug'
import dateFormat from 'date-format'

import type { LoggingEvent } from '@/core/LoggingEvent'
import type { PatternLayout, TokenFunction, LayoutConfig } from '../types/layout'

const debug = DEBUG('log4js:layouts')

/**
 * 布局函数类型
 */
export type LayoutFunction = (loggingEvent: LoggingEvent) => string

/**
 * ANSI 颜色样式配置对象
 * 包含各种文本样式和颜色的 ANSI 转义码
 */
const styles = {
  // styles
  bold: [1, 22],
  italic: [3, 23],
  underline: [4, 24],
  inverse: [7, 27],
  // grayscale
  white: [37, 39],
  grey: [90, 39],
  black: [90, 39],
  // colors
  blue: [34, 39],
  cyan: [36, 39],
  green: [32, 39],
  magenta: [35, 39],
  red: [91, 39],
  yellow: [33, 39],
} as const

/**
 * 样式名称类型
 */
export type StyleName = keyof typeof styles

/**
 * 返回颜色样式的开始 ANSI 转义码
 * @param style - 样式名称
 * @returns ANSI 转义码字符串
 */
function colorizeStart (style: StyleName) {
  return style ? `\x1B[${styles[style][0]}m` : ''
}

/**
 * 返回颜色样式的结束 ANSI 转义码
 * @param style - 样式名称
 * @returns ANSI 转义码字符串
 */
function colorizeEnd (style: StyleName) {
  return style ? `\x1B[${styles[style][1]}m` : ''
}

/**
 * 为字符串添加颜色样式
 * Taken from masylum's fork (https://github.com/masylum/log4js-node)
 * @param str - 要着色的字符串
 * @param style - 样式名称
 * @returns 带有 ANSI 转义码的字符串
 */
function colorize (str: string, style: StyleName) {
  return colorizeStart(style) + str + colorizeEnd(style)
}

/**
 * 格式化时间戳、日志级别和分类名称
 * @param loggingEvent - 日志事件对象
 * @param colour - 颜色样式
 * @returns 格式化后的字符串
 */
function timestampLevelAndCategory (loggingEvent: LoggingEvent, colour: StyleName) {
  return colorize(
    util.format(
      '[%s] [%s] %s - ',
      dateFormat.asString(loggingEvent.startTime),
      loggingEvent.level.toString(),
      loggingEvent.categoryName
    ),
    colour
  )
}

/**
 * BasicLayout 是一个简单的日志布局，用于存储日志
 * 日志格式如下：
 * ```
 * [startTime] [logLevel] categoryName - message\n
 * ```
 * @param loggingEvent - 日志事件对象
 * @returns 格式化后的日志字符串
 * @author Stephan Strittmatter
 */
function basicLayout (loggingEvent: LoggingEvent) {
  return (
    util.format(
      '[%s] [%s] %s - ',
      dateFormat.asString(loggingEvent.startTime),
      loggingEvent.level.toString(),
      loggingEvent.categoryName
    ) + util.format(...loggingEvent.data)
  )
}

/**
 * 带颜色的布局 - 取自 masylum 的分支
 * 与 basicLayout 相同，但带有颜色
 * @param loggingEvent - 日志事件对象
 * @returns 格式化后的带颜色的日志字符串
 */
function colouredLayout (loggingEvent: LoggingEvent) {
  return (
    timestampLevelAndCategory(loggingEvent, loggingEvent.level.colour) +
    util.format(...loggingEvent.data)
  )
}

/**
 * 消息直通布局，仅格式化日志数据
 * @param loggingEvent - 日志事件对象
 * @returns 格式化后的消息字符串
 */
function messagePassThroughLayout (loggingEvent: LoggingEvent) {
  return util.format(...loggingEvent.data)
}

/**
 * 虚拟布局，直接返回日志数据的第一个元素
 * @param loggingEvent - 日志事件对象
 * @returns 日志数据的第一个元素
 */
function dummyLayout (loggingEvent: LoggingEvent) {
  return loggingEvent.data[0]
}

/**
 * 模式布局
 * 格式说明符格式为 %[padding].[truncation][field]{[format]}
 * 例如 %5.10p - 左填充日志级别 5 个字符，最多 10 个字符
 * padding 和 truncation 都可以为负数
 * - 负数截断 = 从字符串末尾截断
 * - 正数截断 = 从字符串开头截断
 * - 负数填充 = 右填充
 * - 正数填充 = 左填充
 *
 * 支持的字段：
 * - %r 时间（toLocaleTimeString 格式）
 * - %p 日志级别
 * - %c 日志分类
 * - %h 主机名
 * - %m 日志数据
 * - %m{l} 其中 l 是整数，log data.slice(l)
 * - %m{l,u} 其中 l 和 u 是整数，log data.slice(l, u)
 * - %d 日期（多种格式）
 * - %% %
 * - %n 换行符
 * - %z 进程 ID
 * - %f 文件名
 * - %l 行号
 * - %o 列位置
 * - %s 调用栈
 * - %C 类名
 * - %M 方法或函数名
 * - %A 方法或函数别名
 * - %F 完全限定调用者名称
 * - %x{<tokenname>} 添加动态标记，标记在 tokens 参数中指定
 * - %X{<tokenname>} 添加动态标记，标记在 logger context 中指定
 * 可以使用 %[ 和 %] 定义彩色块
 *
 * @param pattern - 模式字符串
 * @param tokens - 自定义标记映射表
 * @returns 布局函数
 * @authors ['Stephan Strittmatter', 'Jan Schmidle']
 */
function patternLayout (pattern: string, tokens: Record<string, TokenFunction>): LayoutFunction {
  const TTCC_CONVERSION_PATTERN = '%r %p %c - %m%n'
  const regex =
    /%(-?[0-9]+)?(\.?-?[0-9]+)?([[\]cdhmnprzxXyflosCMAF%])(\{([^}]+)\})?|([^%]+)/

  pattern = pattern || TTCC_CONVERSION_PATTERN

  /**
   * 获取分类名称
   * @param loggingEvent - 日志事件对象
   * @param specifier - 精度指定符
   * @returns 分类名称
   */
  function categoryName (loggingEvent: LoggingEvent, specifier: string) {
    let loggerName = loggingEvent.categoryName
    if (specifier) {
      const precision = parseInt(specifier, 10)
      const loggerNameBits = loggerName.split('.')
      if (precision < loggerNameBits.length) {
        loggerName = loggerNameBits
          .slice(loggerNameBits.length - precision)
          .join('.')
      }
    }
    return loggerName
  }

  /**
   * 格式化为日期
   * @param loggingEvent - 日志事件对象
   * @param specifier - 日期格式指定符
   * @returns 格式化后的日期字符串
   */
  function formatAsDate (loggingEvent: LoggingEvent, specifier: string) {
    let format = dateFormat.ISO8601_FORMAT
    if (specifier) {
      format = specifier
      // Pick up special cases
      switch (format) {
        case 'ISO8601':
        case 'ISO8601_FORMAT':
          format = dateFormat.ISO8601_FORMAT
          break
        case 'ISO8601_WITH_TZ_OFFSET':
        case 'ISO8601_WITH_TZ_OFFSET_FORMAT':
          format = dateFormat.ISO8601_WITH_TZ_OFFSET_FORMAT
          break
        case 'ABSOLUTE':
          process.emitWarning(
            'Pattern %d{ABSOLUTE} is deprecated in favor of %d{ABSOLUTETIME}. ' +
            'Please use %d{ABSOLUTETIME} instead.',
            'DeprecationWarning',
            'log4js-node-DEP0003'
          )
          debug(
            '[log4js-node-DEP0003]',
            'DEPRECATION: Pattern %d{ABSOLUTE} is deprecated and replaced by %d{ABSOLUTETIME}.'
          )
        // falls through
        case 'ABSOLUTETIME':
        case 'ABSOLUTETIME_FORMAT':
          format = dateFormat.ABSOLUTETIME_FORMAT
          break
        case 'DATE':
          process.emitWarning(
            'Pattern %d{DATE} is deprecated due to the confusion it causes when used. ' +
            'Please use %d{DATETIME} instead.',
            'DeprecationWarning',
            'log4js-node-DEP0004'
          )
          debug(
            '[log4js-node-DEP0004]',
            'DEPRECATION: Pattern %d{DATE} is deprecated and replaced by %d{DATETIME}.'
          )
        // falls through
        case 'DATETIME':
        case 'DATETIME_FORMAT':
          format = dateFormat.DATETIME_FORMAT
          break
        // no default
      }
    }
    // Format the date
    return dateFormat.asString(format, loggingEvent.startTime)
  }

  /**
   * 获取主机名
   * @returns 主机名字符串
   */
  function hostname () {
    return os.hostname().toString()
  }

  /**
   * 格式化消息
   * @param loggingEvent - 日志事件对象
   * @param specifier - 切片指定符
   * @returns 格式化后的消息字符串
   */
  function formatMessage (loggingEvent: LoggingEvent, specifier: string) {
    let dataSlice = loggingEvent.data
    if (specifier) {
      const [lowerBound, upperBound] = specifier.split(',').map(Number)
      dataSlice = dataSlice.slice(lowerBound, upperBound)
    }
    return util.format(...dataSlice)
  }

  /**
   * 获取行尾符
   * @returns 行尾符字符串
   */
  function endOfLine () {
    return os.EOL
  }

  /**
   * 获取日志级别
   * @param loggingEvent - 日志事件对象
   * @returns 日志级别字符串
   */
  function logLevel (loggingEvent: LoggingEvent) {
    return loggingEvent.level.toString()
  }

  /**
   * 获取开始时间
   * @param loggingEvent - 日志事件对象
   * @returns 格式化后的时间字符串
   */
  function startTime (loggingEvent: LoggingEvent): string {
    return dateFormat.asString('hh:mm:ss', loggingEvent.startTime)
  }

  /**
   * 获取颜色开始标记
   * @param loggingEvent - 日志事件对象
   * @returns ANSI 转义码字符串
   */
  function startColour (loggingEvent: LoggingEvent) {
    return colorizeStart(loggingEvent.level.colour)
  }

  /**
   * 获取颜色结束标记
   * @param loggingEvent - 日志事件对象
   * @returns ANSI 转义码字符串
   */
  function endColour (loggingEvent: LoggingEvent) {
    return colorizeEnd(loggingEvent.level.colour)
  }

  /**
   * 返回百分号
   * @returns 百分号字符串
   */
  function percent () {
    return '%'
  }

  /**
   * 获取进程 ID
   * @param loggingEvent - 日志事件对象
   * @returns 进程 ID 字符串
   */
  function pid (loggingEvent?: LoggingEvent) {
    return loggingEvent && loggingEvent.pid
      ? loggingEvent.pid.toString()
      : process.pid.toString()
  }

  /**
   * 获取集群信息
   * 用于保持与旧版本模式的兼容性
   * @returns 进程 ID 字符串
   */
  function clusterInfo () {
    // this used to try to return the master and worker pids,
    // but it would never have worked because master pid is not available to workers
    // leaving this here to maintain compatibility for patterns
    return pid()
  }

  /**
   * 获取用户自定义标记值
   * @param loggingEvent - 日志事件对象
   * @param specifier - 标记名称
   * @returns 标记值或 null
   */
  function userDefined (loggingEvent: LoggingEvent, specifier: string) {
    if (typeof tokens[specifier] !== 'undefined') {
      return typeof tokens[specifier] === 'function'
        ? tokens[specifier](loggingEvent)
        : tokens[specifier]
    }

    return null
  }

  /**
   * 获取上下文定义的标记值
   * @param loggingEvent - 日志事件对象
   * @param specifier - 标记名称
   * @returns 标记值或 null
   */
  function contextDefined (loggingEvent: LoggingEvent, specifier: string) {
    const resolver = loggingEvent.context[specifier]

    if (typeof resolver !== 'undefined') {
      return typeof resolver === 'function' ? resolver(loggingEvent) : resolver
    }

    return null
  }

  /**
   * 获取文件名
   * @param loggingEvent - 日志事件对象
   * @param specifier - 文件深度指定符
   * @returns 文件名字符串
   */
  function fileName (loggingEvent: LoggingEvent, specifier: string) {
    let filename = loggingEvent.fileName || ''

    // support for ESM as it uses url instead of path for file
    /* istanbul ignore next: unsure how to simulate ESM for test coverage */
    /**
     * 将文件 URL 转换为路径
     * @param filepath - 文件路径或 URL
     * @returns 转换后的文件路径
     */
    const convertFileURLToPath = function (filepath: string) {
      const urlPrefix = 'file://'
      if (filepath.startsWith(urlPrefix)) {
        // https://nodejs.org/api/url.html#urlfileurltopathurl
        if (typeof url.fileURLToPath === 'function') {
          filepath = url.fileURLToPath(filepath)
        } else {
          // backward-compatible for nodejs pre-10.12.0 (without url.fileURLToPath method)
          // posix: file:///hello/world/foo.txt -> /hello/world/foo.txt -> /hello/world/foo.txt
          // win32: file:///C:/path/foo.txt     -> /C:/path/foo.txt     -> \C:\path\foo.txt     -> C:\path\foo.txt
          // win32: file://nas/foo.txt          -> //nas/foo.txt        -> nas\foo.txt          -> \\nas\foo.txt
          filepath = path.normalize(
            filepath.replace(new RegExp(`^${urlPrefix}`), '')
          )
          if (process.platform === 'win32') {
            if (filepath.startsWith('\\')) {
              filepath = filepath.slice(1)
            } else {
              filepath = path.sep + path.sep + filepath
            }
          }
        }
      }
      return filepath
    }
    filename = convertFileURLToPath(filename)

    if (specifier) {
      const fileDepth = parseInt(specifier, 10)
      const fileList = filename.split(path.sep)
      if (fileList.length > fileDepth) {
        filename = fileList.slice(-fileDepth).join(path.sep)
      }
    }

    return filename
  }

  /**
   * 获取行号
   * @param loggingEvent - 日志事件对象
   * @returns 行号字符串
   */
  function lineNumber (loggingEvent: LoggingEvent) {
    return loggingEvent.lineNumber ? `${loggingEvent.lineNumber}` : ''
  }

  /**
   * 获取列号
   * @param loggingEvent - 日志事件对象
   * @returns 列号字符串
   */
  function columnNumber (loggingEvent: LoggingEvent) {
    return loggingEvent.columnNumber ? `${loggingEvent.columnNumber}` : ''
  }

  /**
   * 获取调用栈
   * @param loggingEvent - 日志事件对象
   * @returns 调用栈字符串
   */
  function callStack (loggingEvent: LoggingEvent) {
    return loggingEvent.callStack || ''
  }

  /**
   * 获取类名
   * @param loggingEvent - 日志事件对象
   * @returns 类名字符串
   */
  function className (loggingEvent: LoggingEvent) {
    return loggingEvent.className || ''
  }

  /**
   * 获取函数名
   * @param loggingEvent - 日志事件对象
   * @returns 函数名字符串
   */
  function functionName (loggingEvent: LoggingEvent) {
    return loggingEvent.functionName || ''
  }

  /**
   * 获取函数别名
   * @param loggingEvent - 日志事件对象
   * @returns 函数别名字符串
   */
  function functionAlias (loggingEvent: LoggingEvent) {
    return loggingEvent.functionAlias || ''
  }

  /**
   * 获取调用者名称
   * @param loggingEvent - 日志事件对象
   * @returns 调用者名称字符串
   */
  function callerName (loggingEvent: LoggingEvent) {
    return loggingEvent.callerName || ''
  }

  /**
   * 格式标记替换器映射表
   */
  const replacers = {
    c: categoryName,
    d: formatAsDate,
    h: hostname,
    m: formatMessage,
    n: endOfLine,
    p: logLevel,
    r: startTime,
    '[': startColour,
    ']': endColour,
    y: clusterInfo,
    z: pid,
    '%': percent,
    x: userDefined,
    X: contextDefined,
    f: fileName,
    l: lineNumber,
    o: columnNumber,
    s: callStack,
    C: className,
    M: functionName,
    A: functionAlias,
    F: callerName,
  } as const

  /**
   * 替换格式标记
   * @param conversionCharacter - 转换字符
   * @param loggingEvent - 日志事件对象
   * @param specifier - 指定符
   * @returns 替换后的值
   */
  function replaceToken (conversionCharacter: keyof typeof replacers, loggingEvent: LoggingEvent, specifier: string) {
    return replacers[conversionCharacter](loggingEvent, specifier)
  }

  /**
   * 截断字符串
   * @param truncation - 截断参数
   * @param toTruncate - 要截断的字符串
   * @returns 截断后的字符串
   */
  function truncate (truncation: string, toTruncate: string) {
    let len
    if (truncation) {
      len = parseInt(truncation.slice(1), 10)
      // negative truncate length means truncate from end of string
      return len > 0 ? toTruncate.slice(0, len) : toTruncate.slice(len)
    }

    return toTruncate
  }

  /**
   * 填充字符串
   * @param padding - 填充参数
   * @param toPad - 要填充的字符串
   * @returns 填充后的字符串
   */
  function pad (padding: string, toPad: string) {
    let len
    if (padding) {
      if (padding.charAt(0) === '-') {
        len = parseInt(padding.slice(1), 10)
        // Right pad with spaces
        while (toPad.length < len) {
          toPad += ' '
        }
      } else {
        len = parseInt(padding, 10)
        // Left pad with spaces
        while (toPad.length < len) {
          toPad = ` ${toPad}`
        }
      }
    }
    return toPad
  }

  /**
   * 截断并填充字符串
   * @param toTruncAndPad - 要处理的字符串
   * @param truncation - 截断参数
   * @param padding - 填充参数
   * @returns 处理后的字符串
   */
  function truncateAndPad (toTruncAndPad: string, truncation: string, padding: string) {
    let replacement = toTruncAndPad
    replacement = truncate(truncation, replacement)
    replacement = pad(padding, replacement)
    return replacement
  }

  return function (loggingEvent: LoggingEvent) {
    let formattedString = ''
    let result
    let searchString = pattern

    while ((result = regex.exec(searchString)) !== null) {
      // const matchedString = result[0];
      const padding = result[1]
      const truncation = result[2]
      const conversionCharacter = result[3] as keyof typeof replacers
      const specifier = result[5]
      const text = result[6]

      // Check if the pattern matched was just normal text
      if (text) {
        formattedString += text.toString()
      } else {
        // Create a raw replacement string based on the conversion
        // character and specifier
        const replacement = replaceToken(
          conversionCharacter,
          loggingEvent,
          specifier
        )
        formattedString += truncateAndPad(replacement, truncation, padding)
      }
      searchString = searchString.slice(result.index + result[0].length)
    }
    return formattedString
  }
}

/**
 * 布局生成器类型
 */
export type LayoutMaker = (config?: LayoutConfig) => LayoutFunction

/**
 * 布局生成器映射表
 */
export const layoutMakers = {
  /**
   * 消息直通布局生成器
   * @returns 布局函数
   */
  messagePassThrough (): LayoutFunction {
    return messagePassThroughLayout
  },
  /**
   * 基础布局生成器
   * @returns 布局函数
   */
  basic (): LayoutFunction {
    return basicLayout
  },
  /**
   * 彩色布局生成器（美式拼写）
   * @returns 布局函数
   */
  colored (): LayoutFunction {
    return colouredLayout
  },
  /**
   * 彩色布局生成器（英式拼写）
   * @returns 布局函数
   */
  coloured (): LayoutFunction {
    return colouredLayout
  },
  /**
   * 模式布局生成器
   * @param config - 配置对象
   * @returns 布局函数
   */
  pattern (config?: PatternLayout): LayoutFunction {
    return patternLayout(config?.pattern || '', config?.tokens || {})
  },
  /**
   * 虚拟布局生成器
   * @returns 布局函数
   */
  dummy (): LayoutFunction {
    return dummyLayout
  },
}

export type LayoutCfg<T extends keyof typeof layoutMakers> = T extends 'pattern' ? PatternLayout : any

export const layouts = {
  basicLayout,
  messagePassThroughLayout,
  patternLayout,
  colouredLayout,
  coloredLayout: colouredLayout,
  dummyLayout,
  /**
   * 添加自定义布局
   * @param name - 布局名称
   * @param serializerGenerator - 序列化生成器函数
   */
  addLayout (name: string, serializerGenerator: LayoutMaker) {
    // @ts-ignore TODO: 这里需要处理类型
    layoutMakers[name] = serializerGenerator
  },
  /**
   * 获取指定名称的布局
   * @param name - 布局名称
   * @param config - 非`pattern`无需配置对象，`pattern`布局必选配置对象
   * @returns 布局函数
   */
  layout<T extends keyof typeof layoutMakers> (name: T, config?: LayoutCfg<T>): LayoutFunction {
    if (name === 'pattern') {
      return layoutMakers.pattern(config as PatternLayout)
    }
    return layoutMakers[name] && layoutMakers[name]()
  },
}

export type Layouts = typeof layouts
