import debug from 'debug'
import path from 'path'

const debugLog = debug('streamroller:fileNameFormatter')

const ZIP_EXT = '.gz'
const DEFAULT_FILENAME_SEP = '.'

export interface FileNameFormatterOptions {
  file: path.ParsedPath
  keepFileExt?: boolean
  needsIndex?: boolean
  alwaysIncludeDate?: boolean
  compress?: boolean
  fileNameSep?: string
}

export interface FormatParams {
  date?: string
  index: number
}

export type FileNameFormatter = (params: FormatParams) => string

export default ({
  file,
  keepFileExt,
  needsIndex,
  alwaysIncludeDate,
  compress,
  fileNameSep,
}: FileNameFormatterOptions): FileNameFormatter => {
  const FILENAME_SEP = fileNameSep || DEFAULT_FILENAME_SEP
  const dirAndName = path.join(file.dir, file.name)

  const ext = (f: string): string => f + file.ext

  const index = (f: string, i: number, d?: string): string =>
    (needsIndex || !d) && i ? f + FILENAME_SEP + i : f

  const date = (f: string, i: number, d?: string): string => {
    return (i > 0 || alwaysIncludeDate) && d ? f + FILENAME_SEP + d : f
  }

  const gzip = (f: string, i: number): string => (i && compress ? f + ZIP_EXT : f)

  type PartFunction = (f: string, i: number, d?: string) => string

  const parts: PartFunction[] = keepFileExt
    ? [date, index, ext, gzip]
    : [ext, date, index, gzip]

  return ({ date: d, index: i }: FormatParams): string => {
    debugLog(`_formatFileName: date=${d}, index=${i}`)
    return parts.reduce(
      (filename, part) => part(filename, i, d),
      dirAndName
    )
  }
}
