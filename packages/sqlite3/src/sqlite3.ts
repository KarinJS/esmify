import { sqlite3 } from './sqlite3-binding'
import { Database } from './database'
import { Statement } from './statement'
import { extendTrace } from './trace'
import './cached'

let isVerbose = false

// Save the stack trace over EIO callbacks.
sqlite3.verbose = function () {
  if (!isVerbose) {
    [
      'prepare',
      'get',
      'run',
      'all',
      'each',
      'map',
      'close',
      'exec',
    ].forEach(function (name) {
      extendTrace(Database.prototype, name)
    });
    [
      'bind',
      'get',
      'run',
      'all',
      'each',
      'map',
      'reset',
      'finalize',
    ].forEach(function (name) {
      extendTrace(Statement.prototype, name)
    })
    isVerbose = true
  }

  return sqlite3
}

export { sqlite3 }
