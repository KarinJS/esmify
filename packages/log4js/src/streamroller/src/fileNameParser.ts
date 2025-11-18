import debug from 'debug'
import path from 'path'
import { asString, parse } from 'date-format'

const debugLog = debug('streamroller:fileNameParser')

const ZIP_EXT = '.gz'
const DEFAULT_FILENAME_SEP = '.'

export interface FileNameParserOptions {
  file: path.ParsedPath
  keepFileExt?: boolean
  pattern?: string
  fileNameSep?: string
}

export interface ParsedFileDetails {
  filename: string
  index: number
  isCompressed: boolean
  date?: string
  timestamp?: number
}

export type FileNameParser = (filename: string) => ParsedFileDetails | null

export default ({ file, keepFileExt, pattern, fileNameSep }: FileNameParserOptions): FileNameParser => {
  const FILENAME_SEP = fileNameSep || DEFAULT_FILENAME_SEP

  // All these functions take two arguments: f, the filename, and p, the result placeholder
  // They return the filename with any matching parts removed.
  // The "zip" function, for instance, removes the ".gz" part of the filename (if present)
  const zip = (f: string, p: ParsedFileDetails): string => {
    if (f.endsWith(ZIP_EXT)) {
      debugLog('it is gzipped')
      p.isCompressed = true
      return f.slice(0, -1 * ZIP_EXT.length)
    }
    return f
  }

  const __NOT_MATCHING__ = '__NOT_MATCHING__'

  const extAtEnd = (f: string): string => {
    if (f.startsWith(file.name) && f.endsWith(file.ext)) {
      debugLog('it starts and ends with the right things')
      return f.slice(file.name.length + 1, -1 * file.ext.length)
    }
    return __NOT_MATCHING__
  }

  const extInMiddle = (f: string): string => {
    if (f.startsWith(file.base)) {
      debugLog('it starts with the right things')
      return f.slice(file.base.length + 1)
    }
    return __NOT_MATCHING__
  }

  const dateAndIndex = (f: string, p: ParsedFileDetails): string => {
    const items = f.split(FILENAME_SEP)
    let indexStr = items[items.length - 1]
    debugLog('items: ', items, ', indexStr: ', indexStr)
    let dateStr = f
    if (indexStr !== undefined && indexStr.match(/^\d+$/)) {
      dateStr = f.slice(0, -1 * (indexStr.length + 1))
      debugLog(`dateStr is ${dateStr}`)
      if (pattern && !dateStr) {
        dateStr = indexStr
        indexStr = '0'
      }
    } else {
      indexStr = '0'
    }

    try {
      // Two arguments for new Date() are intentional. This will set other date
      // components to minimal values in the current timezone instead of UTC,
      // as new Date(0) will do.
      const date = parse(pattern!, dateStr, new Date(0, 0))
      if (asString(pattern!, date) !== dateStr) return f
      p.index = parseInt(indexStr, 10)
      p.date = dateStr
      p.timestamp = date.getTime()
      return ''
    } catch (e) {
      // not a valid date, don't panic.
      debugLog(`Problem parsing ${dateStr} as ${pattern}, error was: `, e)
      return f
    }
  }

  const index = (f: string, p: ParsedFileDetails): string => {
    if (f.match(/^\d+$/)) {
      debugLog('it has an index')
      p.index = parseInt(f, 10)
      return ''
    }
    return f
  }

  type PartFunction = (f: string, p: ParsedFileDetails) => string

  const parts: PartFunction[] = [
    zip,
    keepFileExt ? extAtEnd : extInMiddle,
    pattern ? dateAndIndex : index,
  ]

  return (filename: string): ParsedFileDetails | null => {
    const result: ParsedFileDetails = { filename, index: 0, isCompressed: false }
    // pass the filename through each of the file part parsers
    const whatsLeftOver = parts.reduce(
      (remains, part) => part(remains, result),
      filename
    )
    // if there's anything left after parsing, then it wasn't a valid filename
    return whatsLeftOver ? null : result
  }
}
