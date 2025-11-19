import { inherits } from './util'
import { sqlite3 } from './sqlite3-binding'
import { EventEmitter } from 'node:events'

import type { DatabaseType } from './database'

export const Statement = sqlite3.Statement

/** 将 EventEmitter 的原型方法合并到 Statement */
inherits(Statement, EventEmitter)

Statement.prototype.map = function <T extends Record<string, any>> (...args: any[]): StatementType {
  const params = Array.prototype.slice.call(args)
  const callback = params.pop() as (err: Error | null, result?: Record<string, T | any>) => void
  params.push(function (err: Error | null, rows: T[]) {
    if (err) return callback(err)
    const result: Record<string, T | any> = {}
    if (rows.length) {
      const keys = Object.keys(rows[0])
      const key = keys[0]
      if (keys.length > 2) {
        // Value is an object
        for (let i = 0; i < rows.length; i++) {
          result[rows[i][key]] = rows[i]
        }
      } else {
        const value = keys[1]
        // Value is a plain value
        for (let i = 0; i < rows.length; i++) {
          result[rows[i][key]] = rows[i][value]
        }
      }
    }
    callback(err, result)
  })
  return this.all.apply(this, params)
}

export function normalizeMethod (fn: (this: DatabaseType, stmt: StatementType, args: any[]) => any) {
  return function (this: DatabaseType, sql: string, ...args: any[]) {
    let errBack: ((err: Error | null) => void) | undefined

    if (typeof args[args.length - 1] === 'function') {
      const callback = args[args.length - 1] as (err: Error | null) => void
      errBack = function (err: Error | null) {
        if (err) {
          callback(err)
        }
      }
    }
    return fn.call(this, new Statement(this, sql, errBack), args)
  }
}

export interface StatementType extends EventEmitter {
  new(db: DatabaseType, sql: string, callback?: (err: Error | null) => void): StatementType

  bind (callback?: (err: Error | null) => void): this
  bind (...params: any[]): this

  reset (callback?: (err: null) => void): this

  finalize (callback?: (err: Error) => void): DatabaseType

  run (callback?: (err: Error | null) => void): this
  run (params: any, callback?: (this: RunResult, err: Error | null) => void): this
  run (...params: any[]): this

  get<T> (callback?: (err: Error | null, row?: T) => void): this
  get<T> (params: any, callback?: (this: RunResult, err: Error | null, row?: T) => void): this
  get (...params: any[]): this

  all<T> (callback?: (err: Error | null, rows: T[]) => void): this
  all<T> (params: any, callback?: (this: RunResult, err: Error | null, rows: T[]) => void): this
  all (...params: any[]): this

  each<T> (callback?: (err: Error | null, row: T) => void, complete?: (err: Error | null, count: number) => void): this
  each<T> (params: any, callback?: (this: RunResult, err: Error | null, row: T) => void, complete?: (err: Error | null, count: number) => void): this
  each (...params: any[]): this

  map<T extends Record<string, any>> (callback: (err: Error | null, result?: Record<string, T | any>) => void): this
  map<T extends Record<string, any>> (params: any, callback: (err: Error | null, result?: Record<string, T | any>) => void): this
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  map<T extends Record<string, any>> (...params: any[]): this
}

export interface RunResult extends StatementType {
  lastID: number
  changes: number
}
