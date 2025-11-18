import fs from 'fs'
import os from 'os'
import path from 'path'
import debugModule from 'debug'

import type { LoggingEvent } from '../core/LoggingEvent'
import type { Configure, AppenderConfigBase } from './base'

const debug = debugModule('log4js:fileSync')

/**
 * 文件选项接口
 */
interface FileOptions {
  /** 文件权限模式 */
  mode: number
  /** 文件打开标志 */
  flags: string
  /** 文件编码 */
  encoding?: BufferEncoding
}

/**
 * 触碰文件，确保文件和目录存在
 * @param file - 文件路径
 * @param options - 文件选项
 */
function touchFile (file: string, options: FileOptions): void {
  // 尝试创建目录
  const mkdir = (dir: string): string => {
    try {
      return fs.mkdirSync(dir, { recursive: true }) as string
    } catch (e: any) {
      // 向后兼容 Node.js 10.12.0 之前的 fs.mkdirSync（没有 recursive 选项）
      if (e.code === 'ENOENT') {
        mkdir(path.dirname(dir))
        return mkdir(dir)
      }

      // 除了 EEXIST 和 EROFS（只读文件系统）之外的所有错误都抛出
      if (e.code !== 'EEXIST' && e.code !== 'EROFS') throw e

      // EEXIST: 如果是文件而不是目录则抛出
      // EROFS: 如果未找到目录则抛出
      try {
        if (fs.statSync(dir).isDirectory()) return dir
        throw e
      } catch {
        throw e
      }
    }
  }
  mkdir(path.dirname(file))

  // 尝试抛出 EISDIR、EROFS、EACCES 错误
  fs.appendFileSync(file, '', { mode: options.mode, flag: options.flags })
}

/**
 * 同步滚动文件类
 * 管理文件大小和备份文件的同步滚动
 */
class RollingFileSync {
  /** 行尾符 */
  static readonly eol = os.EOL

  /** 文件名 */
  private filename: string
  /** 最大文件大小 */
  private size: number
  /** 备份文件数量 */
  private backups: number
  /** 文件选项 */
  // private options: FileOptions
  /** 当前文件大小 */
  private currentSize: number

  /**
   * 构造函数
   * @param filename - 文件名
   * @param maxLogSize - 最大日志文件大小
   * @param backups - 备份文件数量
   * @param options - 文件选项
   */
  constructor (filename: string, maxLogSize: number, backups: number, options: FileOptions) {
    debug('In RollingFileStream')

    if (maxLogSize < 0) {
      throw new Error(`maxLogSize (${maxLogSize}) 应该 > 0`)
    }

    this.filename = filename
    this.size = maxLogSize
    this.backups = backups
    // this.options = options
    this.currentSize = 0

    try {
      this.currentSize = fs.statSync(filename).size
    } catch {
      // 文件不存在
      touchFile(filename, options)
    }
  }

  /**
   * 判断是否应该滚动文件
   * @returns 是否应该滚动
   */
  shouldRoll (): boolean {
    debug(
      'should roll with current size %d, and max size %d',
      this.currentSize,
      this.size
    )
    return this.currentSize >= this.size
  }

  /**
   * 滚动文件，将旧文件重命名为备份文件
   * @param filename - 文件名
   */
  roll (filename: string): void {
    const that = this
    const nameMatcher = new RegExp(`^${path.basename(filename)}`)

    /**
     * 过滤出匹配的文件
     * @param item - 文件名
     * @returns 是否匹配
     */
    function justTheseFiles (item: string): boolean {
      return nameMatcher.test(item)
    }

    /**
     * 获取文件的索引号
     * @param filename_ - 文件名
     * @returns 索引号
     */
    function index (filename_: string): number {
      return (
        parseInt(filename_.slice(`${path.basename(filename)}.`.length), 10) || 0
      )
    }

    /**
     * 按索引排序
     * @param a - 文件名 a
     * @param b - 文件名 b
     * @returns 排序结果
     */
    function byIndex (a: string, b: string): number {
      return index(a) - index(b)
    }

    /**
     * 增加文件索引，将文件重命名
     * @param fileToRename - 要重命名的文件
     */
    function increaseFileIndex (fileToRename: string): void {
      const idx = index(fileToRename)
      debug(`Index of ${fileToRename} is ${idx}`)
      if (that.backups === 0) {
        fs.truncateSync(filename, 0)
      } else if (idx < that.backups) {
        // 在 Windows 上，如果将文件重命名为现有文件，可能会收到 EEXIST 错误
        // 因此，我们将首先尝试删除要重命名的文件
        try {
          fs.unlinkSync(`${filename}.${idx + 1}`)
        } catch (e) {
          // 忽略错误：如果无法删除，很可能是因为它不存在
        }

        debug(`Renaming ${fileToRename} -> ${filename}.${idx + 1}`)
        fs.renameSync(
          path.join(path.dirname(filename), fileToRename),
          `${filename}.${idx + 1}`
        )
      }
    }

    /**
     * 重命名文件
     */
    function renameTheFiles (): void {
      // 滚动备份（将 file.n 重命名为 file.n+1，其中 n <= numBackups）
      debug('Renaming the old files')

      const files = fs.readdirSync(path.dirname(filename))
      files
        .filter(justTheseFiles)
        .sort(byIndex)
        .reverse()
        .forEach(increaseFileIndex)
    }

    debug('Rolling, rolling, rolling')
    renameTheFiles()
  }

  /**
   * 写入数据块到文件
   * @param chunk - 数据块
   * @param _encoding - 编码（未使用）
   */
  // eslint-disable-next-line no-unused-vars
  write (chunk: string, _encoding?: BufferEncoding): void {
    const that = this

    /**
     * 写入数据块
     */
    function writeTheChunk (): void {
      debug('writing the chunk to the file')
      that.currentSize += chunk.length
      fs.appendFileSync(that.filename, chunk)
    }

    debug('in write')

    if (this.shouldRoll()) {
      this.currentSize = 0
      this.roll(this.filename)
    }

    writeTheChunk()
  }
}

/**
 * 写入流接口
 */
interface WriteStream {
  /** 写入数据 */
  write: (data: string, encoding?: BufferEncoding) => void
}

/**
 * 文件同步 Appender 配置接口
 */
export interface FileSyncAppenderConfig extends AppenderConfigBase {
  type: 'fileSync'
  /** 日志文件名 */
  filename: string
  /** 最大日志文件大小（字节） */
  maxLogSize?: number
  /** 备份文件数量 */
  backups?: number
  /** 时区偏移量（分钟） */
  timezoneOffset?: number
  /** 文件打开标志 */
  flags?: string
  /** 文件编码 */
  encoding?: BufferEncoding
  /** 文件权限模式 */
  mode?: number
}

/**
 * 文件同步 Appender 类
 */
class FileSyncAppender {
  private logFile: WriteStream
  private layout: (loggingEvent: LoggingEvent, timezoneOffset?: number) => string
  private timezoneOffset?: number

  constructor (
    file: string,
    layout: (loggingEvent: LoggingEvent, timezoneOffset?: number) => string,
    logSize: number | undefined,
    numBackups: number,
    options: FileOptions,
    timezoneOffset?: number
  ) {
    this.layout = layout
    this.timezoneOffset = timezoneOffset
    this.logFile = this.openTheStream(file, logSize, numBackups, options)
  }

  /**
   * 打开文件流
   */
  private openTheStream (
    filePath: string,
    fileSize: number | undefined,
    numFiles: number,
    options: FileOptions
  ) {
    if (fileSize) {
      return new RollingFileSync(filePath, fileSize, numFiles, options)
    }

    // 触碰文件以应用标志（如 w 来截断文件）
    touchFile(filePath, options)

    return {
      write (data: string): void {
        fs.appendFileSync(filePath, data)
      },
    }
  }

  /**
   * 写入日志事件
   */
  log (loggingEvent: LoggingEvent): void {
    this.logFile.write(this.layout(loggingEvent, this.timezoneOffset) + RollingFileSync.eol)
  }
}

/**
 * 配置文件同步 Appender
 * @param config - Appender 配置对象
 * @param layouts - 布局管理器
 * @returns 配置好的文件同步 Appender
 */
export const configure: Configure<FileSyncAppenderConfig> = (config, layouts) => {
  const layout = config.layout
    ? layouts.layout(config.layout.type, config.layout) || layouts.colouredLayout
    : layouts.basicLayout

  const options: FileOptions = {
    flags: config.flags || 'a',
    encoding: config.encoding || 'utf8',
    mode: config.mode || 0o600,
  }

  // 处理文件路径
  let file = config.filename
  if (typeof file !== 'string' || file.length === 0) {
    throw new Error(`无效的文件名: ${file}`)
  } else if (file.endsWith(path.sep)) {
    throw new Error(`文件名是一个目录: ${file}`)
  } else if (file.indexOf(`~${path.sep}`) === 0) {
    // 处理 ~ 扩展: https://github.com/nodejs/node/issues/684
    // 排除 ~ 和 ~filename，因为这些可以是有效的文件
    file = file.replace('~', os.homedir())
  }
  file = path.normalize(file)

  const numBackups = !config.backups && config.backups !== 0 ? 5 : config.backups

  debug(
    'Creating fileSync appender (',
    file,
    ', ',
    config.maxLogSize,
    ', ',
    numBackups,
    ', ',
    options,
    ', ',
    config.timezoneOffset,
    ')'
  )

  // 创建 FileSyncAppender 实例
  const appender = new FileSyncAppender(
    file,
    layout,
    config.maxLogSize,
    numBackups,
    options,
    config.timezoneOffset
  )

  return (loggingEvent) => appender.log(loggingEvent)
}
