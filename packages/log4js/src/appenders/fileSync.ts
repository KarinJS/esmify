import debugFactory from 'debug'
import { normalize, sep, dirname, basename, join } from 'node:path'
import { mkdirSync, appendFileSync, statSync, unlinkSync, renameSync, readdirSync, truncateSync } from 'node:fs'
import { homedir, EOL } from 'node:os'
import type LoggingEvent from '../LoggingEvent'
import type { AppenderFunction, LayoutFunction, LayoutsParam } from '../types/core'
import type { SyncfileAppender } from '../types/appenders'

const debug = debugFactory('log4js:fileSync')

interface FileOptions {
  mode: number
  flags: string
  encoding: BufferEncoding
}

function touchFile (file: string, options: FileOptions): void {
  // attempt to create the directory
  const mkdir = (dir: string): string => {
    try {
      return mkdirSync(dir, { recursive: true }) as string
    } catch (e: unknown) {
      const error = e as NodeJS.ErrnoException
      // backward-compatible fs.mkdirSync for nodejs pre-10.12.0 (without recursive option)
      // recursive creation of parent first
      if (error.code === 'ENOENT') {
        mkdir(dirname(dir))
        return mkdir(dir)
      }

      // throw error for all except EEXIST and EROFS (read-only filesystem)
      if (error.code !== 'EEXIST' && error.code !== 'EROFS') {
        throw error
      }

      // EEXIST: throw if file and not directory
      // EROFS : throw if directory not found
      try {
        if (statSync(dir).isDirectory()) {
          return dir
        }
        throw error
      } catch {
        throw error
      }
    }
  }
  mkdir(dirname(file))

  // try to throw EISDIR, EROFS, EACCES
  appendFileSync(file, '', { mode: options.mode, flag: options.flags })
}

class RollingFileSync {
  private filename: string
  private size: number
  private backups: number
  private currentSize: number

  constructor (filename: string, maxLogSize: number, backups: number, options: FileOptions) {
    debug('In RollingFileStream')

    if (maxLogSize < 0) {
      throw new Error(`maxLogSize (${maxLogSize}) should be > 0`)
    }

    this.filename = filename
    this.size = maxLogSize
    this.backups = backups
    this.currentSize = 0

    const currentFileSize = (file: string): number => {
      let fileSize = 0

      try {
        fileSize = statSync(file).size
      } catch {
        // file does not exist
        touchFile(file, options)
      }
      return fileSize
    }

    this.currentSize = currentFileSize(this.filename)
  }

  shouldRoll (): boolean {
    debug(
      'should roll with current size %d, and max size %d',
      this.currentSize,
      this.size
    )
    return this.currentSize >= this.size
  }

  roll (filename: string): void {
    const nameMatcher = new RegExp(`^${basename(filename)}`)

    const justTheseFiles = (item: string): boolean => {
      return nameMatcher.test(item)
    }

    const index = (filename_: string): number => {
      return (
        parseInt(filename_.slice(`${basename(filename)}.`.length), 10) || 0
      )
    }

    const byIndex = (a: string, b: string): number => {
      return index(a) - index(b)
    }

    const increaseFileIndex = (fileToRename: string): void => {
      const idx = index(fileToRename)
      debug(`Index of ${fileToRename} is ${idx}`)
      if (this.backups === 0) {
        truncateSync(filename, 0)
      } else if (idx < this.backups) {
        // on windows, you can get a EEXIST error if you rename a file to an existing file
        // so, we'll try to delete the file we're renaming to first
        try {
          unlinkSync(`${filename}.${idx + 1}`)
        } catch {
          // ignore err: if we could not delete, it's most likely that it doesn't exist
        }

        debug(`Renaming ${fileToRename} -> ${filename}.${idx + 1}`)
        renameSync(
          join(dirname(filename), fileToRename),
          `${filename}.${idx + 1}`
        )
      }
    }

    const renameTheFiles = (): void => {
      // roll the backups (rename file.n to file.n+1, where n <= numBackups)
      debug('Renaming the old files')

      const files = readdirSync(dirname(filename))
      files
        .filter(justTheseFiles)
        .sort(byIndex)
        .reverse()
        .forEach(increaseFileIndex)
    }

    debug('Rolling, rolling, rolling')
    renameTheFiles()
  }

  write (chunk: string): void {
    debug('in write')

    if (this.shouldRoll()) {
      this.currentSize = 0
      this.roll(this.filename)
    }

    debug('writing the chunk to the file')
    this.currentSize += chunk.length
    appendFileSync(this.filename, chunk)
  }
}

/**
 * File Appender writing the logs to a text file. Supports rolling of logs by size.
 *
 * @param file the file log messages will be written to
 * @param layout a function that takes a logevent and returns a string
 * @param logSize - the maximum size (in bytes) for a log file
 * @param numBackups - the number of log files to keep after logSize has been reached
 * @param options - options to be passed to the underlying stream
 * @param timezoneOffset - optional timezone offset in minutes
 */
function fileAppender (
  file: string,
  layout: LayoutFunction,
  logSize?: number | string,
  numBackups?: number,
  options?: FileOptions,
  timezoneOffset?: number
): AppenderFunction {
  if (typeof file !== 'string' || file.length === 0) {
    throw new Error(`Invalid filename: ${file}`)
  }
  if (file.endsWith(sep)) {
    throw new Error(`Filename is a directory: ${file}`)
  }
  if (file.indexOf(`~${sep}`) === 0) {
    // handle ~ expansion: https://github.com/nodejs/node/issues/684
    // exclude ~ and ~filename as these can be valid files
    file = file.replace('~', homedir())
  }

  file = normalize(file)
  numBackups = !numBackups && numBackups !== 0 ? 5 : numBackups

  debug(
    'Creating fileSync appender (',
    file,
    ', ',
    logSize,
    ', ',
    numBackups,
    ', ',
    options,
    ', ',
    timezoneOffset,
    ')'
  )

  function openTheStream (
    filePath: string,
    fileSize?: number | string,
    numFiles?: number
  ): { write: (data: string) => void } {
    if (fileSize) {
      return new RollingFileSync(
        filePath,
        typeof fileSize === 'string' ? parseInt(fileSize, 10) : fileSize,
        numFiles || 5,
        options!
      )
    }

    // touch the file to apply flags (like w to truncate the file)
    touchFile(filePath, options!)

    return {
      write (data: string): void {
        appendFileSync(filePath, data)
      },
    }
  }

  const logFile = openTheStream(file, logSize, numBackups)

  return (loggingEvent: LoggingEvent): void => {
    logFile.write(layout(loggingEvent, timezoneOffset) + EOL)
  }
}

function configure (config: SyncfileAppender, layouts: LayoutsParam): AppenderFunction {
  let layout = layouts.basicLayout
  if (config.layout) {
    layout = layouts.layout(config.layout.type, config.layout as Record<string, unknown>) || layout
  }

  const options: FileOptions = {
    flags: config.flags || 'a',
    encoding: (config.encoding || 'utf8') as BufferEncoding,
    mode: config.mode ?? 0o600,
  }

  return fileAppender(
    config.filename,
    layout,
    config.maxLogSize,
    config.backups,
    options,
    config.timezoneOffset
  )
}

export { configure }
