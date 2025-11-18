import { test } from 'tap'
import { connectLogger } from '../src/index'

test('connectLogger basic functionality', (t) => {
  // Test that connectLogger is a function
  t.equal(typeof connectLogger, 'function')

  // Test that it returns a middleware function
  const middleware = connectLogger(null as any)
  t.equal(typeof middleware, 'function')

  // Test middleware signature
  t.equal(middleware.length, 3) // (req, res, next)

  t.end()
})

test('connectLogger with options', (t) => {
  const options = {
    level: 'info',
    format: ':method :url',
  }

  const middleware = connectLogger(null as any, options)
  t.equal(typeof middleware, 'function')

  t.end()
})
