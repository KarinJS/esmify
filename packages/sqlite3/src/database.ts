import { inherits } from './util'
import { sqlite3 } from './sqlite3-binding'
import { EventEmitter } from 'node:events'
import { normalizeMethod } from './statement'

import type { RunResult, StatementType } from './statement'

/**
 * SQLite3 数据库构造函数
 */
export const Database = sqlite3.Database
export const Backup = sqlite3.Backup

/** 将 EventEmitter 的原型方法合并到 database */
inherits(Database, EventEmitter)
inherits(Backup, EventEmitter)

// Database#prepare(sql, [bind1, bind2, ...], [callback])
Database.prototype.prepare = normalizeMethod(function (statement, params) {
  return params.length
    ? statement.bind.apply(statement, params)
    : statement
})

// Database#run(sql, [bind1, bind2, ...], [callback])
Database.prototype.run = normalizeMethod(function (statement, params) {
  statement.run.apply(statement, params).finalize()
  return this
})

// Database#get(sql, [bind1, bind2, ...], [callback])
Database.prototype.get = normalizeMethod(function (statement, params) {
  statement.get.apply(statement, params).finalize()
  return this
})

// Database#all(sql, [bind1, bind2, ...], [callback])
Database.prototype.all = normalizeMethod(function (statement, params) {
  statement.all.apply(statement, params).finalize()
  return this
})

// Database#each(sql, [bind1, bind2, ...], [callback], [complete])
Database.prototype.each = normalizeMethod(function (statement, params) {
  statement.each.apply(statement, params).finalize()
  return this
})

Database.prototype.map = normalizeMethod(function (statement, params) {
  statement.map.apply(statement, params).finalize()
  return this
})

// Database#backup(filename, [callback])
// Database#backup(filename, destName, sourceName, filenameIsDest, [callback])
Database.prototype.backup = function (...args: any[]) {
  let backup
  if (args.length <= 2) {
    // By default, we write the main database out to the main database of the named file.
    // This is the most likely use of the backup api.
    backup = new Backup(this, args[0], 'main', 'main', true, args[1])
  } else {
    // Otherwise, give the user full control over the sqlite3_backup_init arguments.
    backup = new Backup(this, args[0], args[1], args[2], args[3], args[4])
  }
  // Per the sqlite docs, exclude the following errors as non-fatal by default.
  backup.retryErrors = [sqlite3.BUSY, sqlite3.LOCKED]
  return backup
}

const supportedEvents = ['trace', 'profile', 'change']

Database.prototype.addListener = Database.prototype.on = function (type: string, ...args: any[]) {
  const val = EventEmitter.prototype.addListener.apply(this, [type, ...args] as [string, (...args: any[]) => void])
  if (supportedEvents.indexOf(type) >= 0) {
    this.configure(type, true)
  }
  return val
}

Database.prototype.removeListener = function (type: string, ...args: any[]) {
  const val = EventEmitter.prototype.removeListener.apply(this, [type, ...args] as [string, (...args: any[]) => void])
  if (supportedEvents.indexOf(type) >= 0 && !this._events[type]) {
    this.configure(type, false)
  }
  return val
}

Database.prototype.removeAllListeners = function (type?: string) {
  const val = EventEmitter.prototype.removeAllListeners.apply(this, type ? [type] : [])
  if (type && supportedEvents.indexOf(type) >= 0) {
    this.configure(type, false)
  }
  return val
}

/**
 * SQLite3 数据库类
 */
export interface DatabaseType extends EventEmitter {
  new(filename: string, callback?: (err: Error | null) => void): DatabaseType
  new(filename: string, mode?: number, callback?: (err: Error | null) => void): DatabaseType

  close (callback?: (err: Error | null) => void): void

  run (sql: string, callback?: (this: RunResult, err: Error | null) => void): this
  run (sql: string, params: any, callback?: (this: RunResult, err: Error | null) => void): this
  run (sql: string, ...params: any[]): this

  get<T> (sql: string, callback?: (this: StatementType, err: Error | null, row: T) => void): this
  get<T> (sql: string, params: any, callback?: (this: StatementType, err: Error | null, row: T) => void): this
  get (sql: string, ...params: any[]): this

  all<T> (sql: string, callback?: (this: StatementType, err: Error | null, rows: T[]) => void): this
  all<T> (sql: string, params: any, callback?: (this: StatementType, err: Error | null, rows: T[]) => void): this
  all (sql: string, ...params: any[]): this

  each<T> (sql: string, callback?: (this: StatementType, err: Error | null, row: T) => void, complete?: (err: Error | null, count: number) => void): this
  each<T> (sql: string, params: any, callback?: (this: StatementType, err: Error | null, row: T) => void, complete?: (err: Error | null, count: number) => void): this
  each (sql: string, ...params: any[]): this

  exec (sql: string, callback?: (this: StatementType, err: Error | null) => void): this

  prepare (sql: string, callback?: (this: StatementType, err: Error | null) => void): StatementType
  prepare (sql: string, params: any, callback?: (this: StatementType, err: Error | null) => void): StatementType
  prepare (sql: string, ...params: any[]): StatementType

  serialize (callback?: () => void): void
  parallelize (callback?: () => void): void

  on (event: 'trace', listener: (sql: string) => void): this
  on (event: 'profile', listener: (sql: string, time: number) => void): this
  on (event: 'change', listener: (type: string, database: string, table: string, rowid: number) => void): this
  on (event: 'error', listener: (err: Error) => void): this
  on (event: 'open' | 'close', listener: () => void): this
  on (event: string, listener: (...args: any[]) => void): this

  configure (option: 'busyTimeout', value: number): void
  configure (option: 'limit', id: number, value: number): void

  loadExtension (filename: string, callback?: (err: Error | null) => void): this

  wait (callback?: (param: null) => void): this

  interrupt (): void

  open?: boolean
}

export { }
