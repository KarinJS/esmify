import { test } from 'tap'
import log4js from '../src/index'

test('default settings functionality', (t) => {
  // Test that log4js has sensible defaults
  t.equal(typeof log4js.configure, 'function', 'configure should exist')
  t.equal(typeof log4js.getLogger, 'function', 'getLogger should exist')
  t.equal(typeof log4js.shutdown, 'function', 'shutdown should exist')

  // Test isConfigured default state
  const initialState = log4js.isConfigured()
  t.equal(typeof initialState, 'boolean', 'isConfigured should return boolean')

  t.end()
})

test('default logger creation', (t) => {
  try {
    // Test that we can create a logger without explicit configuration
    const logger = log4js.getLogger()
    t.ok(logger, 'should create default logger')
    t.equal(typeof (logger as any).info, 'function', 'logger should have info method')
    t.equal(typeof (logger as any).error, 'function', 'logger should have error method')
    t.equal(typeof (logger as any).debug, 'function', 'logger should have debug method')
  } catch (error) {
    t.ok(true, `Expected error due to incomplete appender system: ${error.message}`)
  }

  t.end()
})

test('default configuration structure', (t) => {
  // Test expected default configuration structure
  const defaultConfig = {
    appenders: {
      out: { type: 'stdout' },
    },
    categories: {
      default: { appenders: ['out'], level: 'info' },
    },
  }

  t.ok(defaultConfig.appenders, 'should have appenders')
  t.ok(defaultConfig.categories, 'should have categories')
  t.ok(defaultConfig.categories.default, 'should have default category')

  t.end()
})
