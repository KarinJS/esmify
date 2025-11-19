import { createRequire } from 'module'

import type { Cached } from './cached'
import type { DatabaseType } from './database'
import type { RunResult, StatementType } from './statement'
import type { EventEmitter } from 'node:events'

const require = createRequire(import.meta.url)

const tryRequire = () => {
  const target = Object.keys(require('../package.json').optionalDependencies)

  for (const name of target) {
    try {
      return require(name)
    } catch { }
  }

  /** 如果走到这里，说明没有找到合适的模块，让用户使用官方包 */
  throw new Error(
    '找不到适用于您平台的 sqlite3-napi-v6 二进制文件。请从 npm 安装官方的 sqlite3 包。\n' +
    'Cannot find a suitable sqlite3-napi-v6 binary for your platform. Please install the official sqlite3 package from npm.'
  )
}

/**
 * SQLite3
 */
export const sqlite3 = tryRequire() as Sqlite3

export interface Sqlite3 {
  OPEN_READONLY: number
  OPEN_READWRITE: number
  OPEN_CREATE: number
  OPEN_FULLMUTEX: number
  OPEN_SHAREDCACHE: number
  OPEN_PRIVATECACHE: number
  OPEN_URI: number

  VERSION: string
  SOURCE_ID: string
  VERSION_NUMBER: number

  OK: number
  ERROR: number
  INTERNAL: number
  PERM: number
  ABORT: number
  BUSY: number
  LOCKED: number
  NOMEM: number
  READONLY: number
  INTERRUPT: number
  IOERR: number
  CORRUPT: number
  NOTFOUND: number
  FULL: number
  CANTOPEN: number
  PROTOCOL: number
  EMPTY: number
  SCHEMA: number
  TOOBIG: number
  CONSTRAINT: number
  MISMATCH: number
  MISUSE: number
  NOLFS: number
  AUTH: number
  FORMAT: number
  RANGE: number
  NOTADB: number

  LIMIT_LENGTH: number
  LIMIT_SQL_LENGTH: number
  LIMIT_COLUMN: number
  LIMIT_EXPR_DEPTH: number
  LIMIT_COMPOUND_SELECT: number
  LIMIT_VDBE_OP: number
  LIMIT_FUNCTION_ARG: number
  LIMIT_ATTACHED: number
  LIMIT_LIKE_PATTERN_LENGTH: number
  LIMIT_VARIABLE_NUMBER: number
  LIMIT_TRIGGER_DEPTH: number
  LIMIT_WORKER_THREADS: number

  cached: Cached
  RunResult: RunResult
  Statement: StatementType
  Database: DatabaseType
  Backup: BackupType
  verbose (): this
}

/**
 * SQLite3 备份类
 */
export interface BackupType extends EventEmitter {
  new(
    db: DatabaseType,
    filename: string,
    destName: string,
    sourceName: string,
    filenameIsDest: boolean,
    callback?: (err: Error | null) => void
  ): BackupType

  idle: boolean
  completed: boolean
  failed: boolean
  remaining: number
  pageCount: number
  retryErrors: number[]

  step (pages: number, callback?: (err: Error | null) => void): this
  finish (callback?: (err: Error | null) => void): this
}
