import path from 'node:path'
import { Database } from './database'
import { sqlite3 } from './sqlite3-binding'

import type { DatabaseType } from './database'

export interface Cached {
  Database (filename: string, callback?: (this: DatabaseType, err: Error | null) => void): DatabaseType
  Database (filename: string, mode?: number, callback?: (this: DatabaseType, err: Error | null) => void): DatabaseType
  objects: Record<string, DatabaseType>
}

sqlite3.cached = {
  Database: function (file, a, b) {
    if (file === '' || file === ':memory:') {
      // Don't cache special databases.
      return new Database(file, a, b)
    }

    let db: DatabaseType
    file = path.resolve(file)

    if (!sqlite3.cached.objects[file]) {
      db = sqlite3.cached.objects[file] = new Database(file, a, b)
    } else {
      // Make sure the callback is called.
      db = sqlite3.cached.objects[file]
      const callback = (typeof a === 'number') ? b : a
      if (typeof callback === 'function') {
        function cb () {
          callback!.call(db, null)
        }
        if (db.open) process.nextTick(cb)
        else db.once('open', cb)
      }
    }

    return db
  },
  objects: {},
} as Cached

export { }
