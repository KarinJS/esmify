import fs from 'node:fs'

fs.cpSync('node_modules/sqlite3/lib', 'lib', { recursive: true })
