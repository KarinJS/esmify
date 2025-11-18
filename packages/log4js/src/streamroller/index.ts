/* eslint-disable import-x/no-named-default */
// Main exports
import { default as RollingFileWriteStream } from './src/RollingFileWriteStream.js'
import { default as RollingFileStream } from './src/RollingFileStream.js'
import { default as DateRollingFileStream } from './src/DateRollingFileStream.js'

// Utility exports
import { default as fileNameFormatter } from './src/fileNameFormatter.js'
import { default as fileNameParser } from './src/fileNameParser.js'
import { default as moveAndMaybeCompressFile } from './src/moveAndMaybeCompressFile.js'
import { default as now } from './src/now.js'

const streams = {
  RollingFileWriteStream,
  RollingFileStream,
  DateRollingFileStream,
  fileNameFormatter,
  fileNameParser,
  moveAndMaybeCompressFile,
  now,
}

export default streams

export {
  RollingFileWriteStream,
  RollingFileStream,
  DateRollingFileStream,
  fileNameFormatter,
  fileNameParser,
  moveAndMaybeCompressFile,
  now,
}

// Type exports
export type {
  RollingFileWriteStreamOptions,
} from './src/RollingFileWriteStream.js'

export type {
  RollingFileStreamOptions,
} from './src/RollingFileStream.js'

export type {
  DateRollingFileStreamOptions,
} from './src/DateRollingFileStream.js'

export type {
  FileNameFormatterOptions,
  FormatParams,
  FileNameFormatter,
} from './src/fileNameFormatter.js'

export type {
  FileNameParserOptions,
  ParsedFileDetails,
  FileNameParser,
} from './src/fileNameParser.js'

export type {
  MoveAndCompressOptions,
} from './src/moveAndMaybeCompressFile.js'
