import { test } from 'tap'
import log4js from '../src/log4js'

test('configuration validation - real tests', (batch) => {
  batch.test('should reject configuration without appenders', (t) => {
    t.throws(() => {
      log4js.configure({
        categories: {
          default: { appenders: ['console'], level: 'info' },
        },
      } as any)
    }, /must have a property "appenders"/, 'should throw error for missing appenders')

    log4js.shutdown()
    t.end()
  })

  batch.test('should reject configuration without categories', (t) => {
    t.throws(() => {
      log4js.configure({
        appenders: {
          console: { type: 'console' },
        },
      } as any)
    }, /must have a property "categories"/, 'should throw error for missing categories')

    log4js.shutdown()
    t.end()
  })

  batch.test('should reject configuration without default category', (t) => {
    t.throws(() => {
      log4js.configure({
        appenders: {
          console: { type: 'console' },
        },
        categories: {
          custom: { appenders: ['console'], level: 'info' },
        },
      })
    }, /must define a "default" category/, 'should throw error for missing default category')

    log4js.shutdown()
    t.end()
  })

  batch.test('should reject category with undefined appender', (t) => {
    t.throws(() => {
      log4js.configure({
        appenders: {
          console: { type: 'console' },
        },
        categories: {
          default: { appenders: ['nonexistent'], level: 'info' },
        },
      })
    }, /appender "nonexistent" is not defined/, 'should throw error for undefined appender')

    log4js.shutdown()
    t.end()
  })

  batch.test('should reject category with invalid level', (t) => {
    t.throws(() => {
      log4js.configure({
        appenders: {
          console: { type: 'console' },
        },
        categories: {
          default: { appenders: ['console'], level: 'INVALID_LEVEL' },
        },
      })
    }, /level "INVALID_LEVEL" not recognised/, 'should throw error for invalid level')

    log4js.shutdown()
    t.end()
  })

  batch.test('should reject appender without type', (t) => {
    t.throws(() => {
      log4js.configure({
        appenders: {
          broken: {} as any,
        },
        categories: {
          default: { appenders: ['broken'], level: 'info' },
        },
      })
    }, /must be an object with property "type"/, 'should throw error for appender without type')

    log4js.shutdown()
    t.end()
  })

  batch.test('should reject appender with invalid type', (t) => {
    t.throws(() => {
      log4js.configure({
        appenders: {
          broken: { type: 'nonexistent-appender-type' },
        },
        categories: {
          default: { appenders: ['broken'], level: 'info' },
        },
      })
    }, /could not be (found|loaded)/, 'should throw error for invalid appender type')

    log4js.shutdown()
    t.end()
  })

  batch.test('should accept valid minimal configuration', (t) => {
    t.doesNotThrow(() => {
      log4js.configure({
        appenders: {
          out: { type: 'stdout' },
        },
        categories: {
          default: { appenders: ['out'], level: 'info' },
        },
      })
    }, 'should accept valid minimal configuration')

    const logger = log4js.getLogger()
    t.ok(logger, 'should create logger')

    log4js.shutdown()
    t.end()
  })

  batch.test('should accept configuration with multiple appenders', (t) => {
    t.doesNotThrow(() => {
      log4js.configure({
        appenders: {
          out: { type: 'stdout' },
          err: { type: 'stderr' },
          rec: { type: 'recording' },
        },
        categories: {
          default: { appenders: ['out', 'err', 'rec'], level: 'debug' },
        },
      })
    }, 'should accept configuration with multiple appenders')

    log4js.shutdown()
    t.end()
  })

  batch.test('should accept configuration with multiple categories', (t) => {
    t.doesNotThrow(() => {
      log4js.configure({
        appenders: {
          out: { type: 'stdout' },
          rec: { type: 'recording' },
        },
        categories: {
          default: { appenders: ['out'], level: 'info' },
          database: { appenders: ['rec'], level: 'debug' },
          'web.server': { appenders: ['out', 'rec'], level: 'warn' },
        },
      })
    }, 'should accept configuration with multiple categories')

    const logger1 = log4js.getLogger()
    const logger2 = log4js.getLogger('database')
    const logger3 = log4js.getLogger('web.server')

    t.ok(logger1, 'should create default logger')
    t.ok(logger2, 'should create database logger')
    t.ok(logger3, 'should create web.server logger')

    log4js.shutdown()
    t.end()
  })

  batch.test('should accept configuration with custom levels', (t) => {
    t.doesNotThrow(() => {
      log4js.configure({
        appenders: {
          out: { type: 'stdout' },
        },
        categories: {
          default: { appenders: ['out'], level: 'info' },
        },
        levels: {
          custom: { value: 15000, colour: 'blue' },
        },
      })
    }, 'should accept configuration with custom levels')

    log4js.shutdown()
    t.end()
  })

  batch.test('should reject category with non-boolean enableCallStack', (t) => {
    t.throws(() => {
      log4js.configure({
        appenders: {
          out: { type: 'stdout' },
        },
        categories: {
          default: {
            appenders: ['out'],
            level: 'info',
            enableCallStack: 'yes' as any,
          },
        },
      })
    }, /enableCallStack must be boolean/, 'should throw error for non-boolean enableCallStack')

    log4js.shutdown()
    t.end()
  })

  batch.test('should accept category with boolean enableCallStack', (t) => {
    t.doesNotThrow(() => {
      log4js.configure({
        appenders: {
          out: { type: 'stdout' },
        },
        categories: {
          default: {
            appenders: ['out'],
            level: 'info',
            enableCallStack: true,
          },
        },
      })
    }, 'should accept boolean enableCallStack')

    log4js.shutdown()
    t.end()
  })

  batch.test('should reject category with empty appenders array', (t) => {
    t.throws(() => {
      log4js.configure({
        appenders: {
          out: { type: 'stdout' },
        },
        categories: {
          default: { appenders: [], level: 'info' },
        },
      })
    }, /must contain at least one appender/, 'should throw error for empty appenders array')

    log4js.shutdown()
    t.end()
  })

  batch.test('should reject category with non-array appenders', (t) => {
    t.throws(() => {
      log4js.configure({
        appenders: {
          out: { type: 'stdout' },
        },
        categories: {
          default: { appenders: 'out' as any, level: 'info' },
        },
      })
    }, /must be an array/, 'should throw error for non-array appenders')

    log4js.shutdown()
    t.end()
  })

  batch.end()
})
