/* eslint-disable @stylistic/brace-style */
import debug from 'debug'
import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import os from 'os'
import newNow from './now.js'
import { asString } from 'date-format'
import { Writable, WritableOptions } from 'stream'
import fileNameFormatter, { type FileNameFormatter } from './fileNameFormatter.js'
import fileNameParser, { type FileNameParser, type ParsedFileDetails } from './fileNameParser.js'
import moveAndMaybeCompressFile from './moveAndMaybeCompressFile.js'

const debugLog = debug('streamroller:RollingFileWriteStream')

const deleteFiles = async (fileNames: string[]): Promise<void[]> => {
  debugLog(`deleteFiles: files to delete: ${fileNames}`)
  return Promise.all(fileNames.map(f => fsp.unlink(f).catch((e) => {
    debugLog(`deleteFiles: error when unlinking ${f}, ignoring. Error was ${e}`)
  })))
}

export interface RollingFileWriteStreamOptions extends WritableOptions {
  /**
   * The max numbers of files to keep.
   */
  numToKeep?: number
  /**
   * The maxSize one file can reach. Unit is Byte.
   * This should be more than 1024. The default is 0.
   * If not specified or 0, then no log rolling will happen.
   */
  maxSize?: number
  /**
   * The mode of the files. The default is '0600'. Refer to stream.writable for more.
   */
  mode?: number
  /**
   * The default is 'a'. Refer to stream.flags for more.
   */
  flags?: string
  /**
   * Whether to compress backup files.
   */
  compress?: boolean
  /**
   * Whether to keep the file extension.
   */
  keepFileExt?: boolean
  /**
   * The date string pattern in the file name.
   */
  pattern?: string
  /**
   * Whether to add date to the name of the first file.
   */
  alwaysIncludePattern?: boolean
  /**
   * @deprecated Use numBackups instead
   */
  daysToKeep?: number
  /**
   * Number of backup files to keep
   */
  numBackups?: number
  /**
   * File name separator
   */
  fileNameSep?: string
}

interface ParsedOptions extends WritableOptions {
  maxSize: number
  numToKeep: number
  encoding: BufferEncoding
  mode: number
  flags: string
  compress: boolean
  keepFileExt: boolean
  alwaysIncludePattern: boolean
  pattern?: string
  fileNameSep?: string
}

interface StreamState {
  currentSize: number
  currentDate?: string
}

/**
 * RollingFileWriteStream is mainly used when writing to a file rolling by date or size.
 * RollingFileWriteStream inherits from stream.Writable
 */
class RollingFileWriteStream extends Writable {
  private options: ParsedOptions
  private fileObject: path.ParsedPath
  private fileFormatter: FileNameFormatter
  private fileNameParser: FileNameParser
  private state: StreamState
  private filename: string
  private currentFileStream!: fs.WriteStream

  /**
   * Create a RollingFileWriteStream
   * @param filePath - The file path to write.
   * @param options - The extra options
   */
  constructor (filePath: string, options?: RollingFileWriteStreamOptions) {
    debugLog(`constructor: creating RollingFileWriteStream. path=${filePath}`)
    if (typeof filePath !== 'string' || filePath.length === 0) {
      throw new Error(`Invalid filename: ${filePath}`)
    } else if (filePath.endsWith(path.sep)) {
      throw new Error(`Filename is a directory: ${filePath}`)
    } else if (filePath.indexOf(`~${path.sep}`) === 0) {
      // handle ~ expansion: https://github.com/nodejs/node/issues/684
      // exclude ~ and ~filename as these can be valid files
      filePath = filePath.replace('~', os.homedir())
    }
    super(options)
    this.options = this._parseOption(options)
    this.fileObject = path.parse(filePath)
    if (this.fileObject.dir === '') {
      this.fileObject = path.parse(path.join(process.cwd(), filePath))
    }
    this.fileFormatter = fileNameFormatter({
      file: this.fileObject,
      alwaysIncludeDate: this.options.alwaysIncludePattern,
      needsIndex: this.options.maxSize < Number.MAX_SAFE_INTEGER,
      compress: this.options.compress,
      keepFileExt: this.options.keepFileExt,
      fileNameSep: this.options.fileNameSep,
    })

    this.fileNameParser = fileNameParser({
      file: this.fileObject,
      keepFileExt: this.options.keepFileExt,
      pattern: this.options.pattern,
      fileNameSep: this.options.fileNameSep,
    })

    this.state = {
      currentSize: 0,
    }

    if (this.options.pattern) {
      this.state.currentDate = asString(this.options.pattern, newNow())
    }

    this.filename = this.fileFormatter({
      index: 0,
      date: this.state.currentDate,
    })
    if (['a', 'a+', 'as', 'as+'].includes(this.options.flags)) {
      this._setExistingSizeAndDate()
    }

    debugLog(
      `constructor: create new file ${this.filename}, state=${JSON.stringify(
        this.state
      )}`
    )
    this._renewWriteStream()
  }

  private _setExistingSizeAndDate (): void {
    try {
      const stats = fs.statSync(this.filename)
      this.state.currentSize = stats.size
      if (this.options.pattern) {
        this.state.currentDate = asString(this.options.pattern, stats.mtime)
      }
    } catch (e) {
      // file does not exist, that's fine - move along

    }
  }

  private _parseOption (rawOptions?: RollingFileWriteStreamOptions): ParsedOptions {
    const defaultOptions: ParsedOptions = {
      maxSize: 0,
      numToKeep: Number.MAX_SAFE_INTEGER,
      encoding: 'utf8',
      mode: parseInt('0600', 8),
      flags: 'a',
      compress: false,
      keepFileExt: false,
      alwaysIncludePattern: false,
    }
    const options = Object.assign({}, defaultOptions, rawOptions) as ParsedOptions
    if (!options.maxSize) {
      options.maxSize = 0
    } else if (options.maxSize <= 0) {
      throw new Error(`options.maxSize (${options.maxSize}) should be > 0`)
    }
    // options.numBackups will supercede options.numToKeep
    if ((rawOptions?.numBackups !== undefined && rawOptions.numBackups !== null) || rawOptions?.numBackups === 0) {
      if (rawOptions.numBackups < 0) {
        throw new Error(`options.numBackups (${rawOptions.numBackups}) should be >= 0`)
      } else if (rawOptions.numBackups >= Number.MAX_SAFE_INTEGER) {
        // to cater for numToKeep (include the hot file) at Number.MAX_SAFE_INTEGER
        throw new Error(`options.numBackups (${rawOptions.numBackups}) should be < Number.MAX_SAFE_INTEGER`)
      } else {
        options.numToKeep = rawOptions.numBackups + 1
      }
    } else if (options.numToKeep <= 0) {
      throw new Error(`options.numToKeep (${options.numToKeep}) should be > 0`)
    }
    debugLog(
      `_parseOption: creating stream with option=${JSON.stringify(options)}`
    )
    return options
  }

  _final (callback: (error?: Error | null) => void): void {
    this.currentFileStream.end('', this.options.encoding, callback)
  }

  _write (chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this._shouldRoll().then(() => {
      debugLog(
        '_write: writing chunk. ' +
        `file=${this.currentFileStream.path} ` +
        `state=${JSON.stringify(this.state)} ` +
        `chunk=${chunk}`
      )
      this.currentFileStream.write(chunk, encoding, e => {
        this.state.currentSize += chunk.length
        callback(e ?? undefined)
      })
    })
  }

  private async _shouldRoll (): Promise<void> {
    if (this._dateChanged() || this._tooBig()) {
      debugLog(
        `_shouldRoll: rolling because dateChanged? ${this._dateChanged()} or tooBig? ${this._tooBig()}`
      )
      await this._roll()
    }
  }

  private _dateChanged (): boolean {
    return !!(
      this.state.currentDate &&
      this.state.currentDate !== asString(this.options.pattern!, newNow())
    )
  }

  private _tooBig (): boolean {
    return this.state.currentSize >= this.options.maxSize
  }

  private _roll (): Promise<void> {
    debugLog('_roll: closing the current stream')
    return new Promise((resolve, reject) => {
      this.currentFileStream.end('', this.options.encoding, () => {
        this._moveOldFiles()
          .then(resolve)
          .catch(reject)
      })
    })
  }

  private async _moveOldFiles (): Promise<void> {
    const files = await this._getExistingFiles()
    const todaysFiles = this.state.currentDate
      ? files.filter(f => f.date === this.state.currentDate)
      : files
    for (let i = todaysFiles.length; i >= 0; i--) {
      debugLog(`_moveOldFiles: i = ${i}`)
      const sourceFilePath = this.fileFormatter({
        date: this.state.currentDate,
        index: i,
      })
      const targetFilePath = this.fileFormatter({
        date: this.state.currentDate,
        index: i + 1,
      })

      const moveAndCompressOptions = {
        compress: this.options.compress && i === 0,
        mode: this.options.mode,
      }
      await moveAndMaybeCompressFile(
        sourceFilePath,
        targetFilePath,
        moveAndCompressOptions
      )
    }

    this.state.currentSize = 0
    this.state.currentDate = this.state.currentDate
      ? asString(this.options.pattern!, newNow())
      : undefined
    debugLog(
      `_moveOldFiles: finished rolling files. state=${JSON.stringify(
        this.state
      )}`
    )
    this._renewWriteStream()
    // wait for the file to be open before cleaning up old ones,
    // otherwise the daysToKeep calculations can be off
    await new Promise<void>((resolve, reject) => {
      this.currentFileStream.write('', 'utf8', () => {
        this._clean()
          .then(resolve)
          .catch(reject)
      })
    })
  }

  // Sorted from the oldest to the latest
  private async _getExistingFiles (): Promise<ParsedFileDetails[]> {
    const files = await fsp.readdir(this.fileObject.dir)
      .catch(/* istanbul ignore next: will not happen on windows */() => [] as string[])

    debugLog(`_getExistingFiles: files=${files}`)
    const existingFileDetails = files
      .map(n => this.fileNameParser(n))
      .filter((n): n is ParsedFileDetails => n !== null)

    const getKey = (n: ParsedFileDetails) =>
      (n.timestamp ? n.timestamp : newNow().getTime()) - n.index
    existingFileDetails.sort((a, b) => getKey(a) - getKey(b))

    return existingFileDetails
  }

  private _renewWriteStream (): void {
    const filePath = this.fileFormatter({
      date: this.state.currentDate,
      index: 0,
    })

    // attempt to create the directory
    const mkdir = (dir: string): string | undefined => {
      try {
        return fs.mkdirSync(dir, { recursive: true })
      }
      // backward-compatible fs.mkdirSync for nodejs pre-10.12.0 (without recursive option)
      catch (e: any) {
        // recursive creation of parent first
        if (e.code === 'ENOENT') {
          mkdir(path.dirname(dir))
          return mkdir(dir)
        }

        // throw error for all except EEXIST and EROFS (read-only filesystem)
        if (e.code !== 'EEXIST' && e.code !== 'EROFS') {
          throw e
        }

        // EEXIST: throw if file and not directory
        // EROFS : throw if directory not found
        else {
          try {
            if (fs.statSync(dir).isDirectory()) {
              return dir
            }
            throw e
          } catch (err) {
            throw e
          }
        }
      }
    }
    mkdir(this.fileObject.dir)

    const ops = {
      flags: this.options.flags,
      encoding: this.options.encoding,
      mode: this.options.mode,
    }
    const renameKey = <T extends Record<string, any>> (obj: T, oldKey: string, newKey: string): any => {
      const result = { ...obj } as any
      result[newKey] = result[oldKey]
      delete result[oldKey]
      return result
    }
    // try to throw EISDIR, EROFS, EACCES
    fs.appendFileSync(filePath, '', renameKey({ ...ops }, 'flags', 'flag'))
    this.currentFileStream = fs.createWriteStream(filePath, ops)
    this.currentFileStream.on('error', e => {
      this.emit('error', e)
    })
  }

  private async _clean (): Promise<void> {
    const existingFileDetails = await this._getExistingFiles()
    debugLog(
      `_clean: numToKeep = ${this.options.numToKeep}, existingFiles = ${existingFileDetails.length}`
    )
    debugLog('_clean: existing files are: ', existingFileDetails)
    if (this._tooManyFiles(existingFileDetails.length)) {
      const fileNamesToRemove = existingFileDetails
        .slice(0, existingFileDetails.length - this.options.numToKeep)
        .map(f => path.format({ dir: this.fileObject.dir, base: f.filename }))
      await deleteFiles(fileNamesToRemove)
    }
  }

  private _tooManyFiles (numFiles: number): boolean {
    return this.options.numToKeep > 0 && numFiles > this.options.numToKeep
  }
}

export default RollingFileWriteStream
