import { test } from 'tap'
import log4js from '../src/log4js'
import * as recording from '../src/appenders/recording'

test('appender loading and initialization', (batch) => {
  batch.test('logLevelFilter with nested appender should load synchronously', (t) => {
    // This tests the fix for the bug where logLevelFilter appenders were not loaded
    // before category validation, causing "appender not defined" errors
    log4js.configure({
      appenders: {
        console: { type: 'stdout' },
        errorFile: { type: 'recording' },
        errors: {
          type: 'logLevelFilter',
          appender: 'errorFile',
          level: 'error',
        },
      },
      categories: {
        default: {
          appenders: ['console', 'errors'],
          level: 'info',
        },
      },
    })

    const logger = log4js.getLogger()

    // Test that logger was created successfully
    t.ok(logger, 'logger should be created')
    t.equal(typeof logger.info, 'function', 'logger.info should be a function')
    t.equal(typeof logger.error, 'function', 'logger.error should be a function')

    // Test that error filter works
    recording.reset()
    logger.info('This is info')
    logger.error('This is error')

    const events = recording.replay()
    t.equal(events.length, 1, 'only error should be recorded by errorFile appender')
    t.equal(events[0].level.toString(), 'ERROR', 'recorded event should be ERROR level')
    t.equal(events[0].data[0], 'This is error', 'recorded message should match')

    log4js.shutdown()
    t.end()
  })

  batch.test('categoryFilter with nested appender should load synchronously', (t) => {
    log4js.configure({
      appenders: {
        recording1: { type: 'recording' },
        filtered: {
          type: 'categoryFilter',
          exclude: ['excluded'],
          appender: 'recording1',
        },
      },
      categories: {
        default: {
          appenders: ['filtered'],
          level: 'info',
        },
      },
    })

    const defaultLogger = log4js.getLogger()
    const excludedLogger = log4js.getLogger('excluded')

    recording.reset()
    defaultLogger.info('default message')
    excludedLogger.info('excluded message')

    const events = recording.replay()
    t.equal(events.length, 1, 'only non-excluded category should be recorded')
    t.equal(events[0].data[0], 'default message', 'should record default message')

    log4js.shutdown()
    t.end()
  })

  batch.test('noLogFilter with nested appender should load synchronously', (t) => {
    log4js.configure({
      appenders: {
        recording1: { type: 'recording' },
        filtered: {
          type: 'noLogFilter',
          exclude: 'password',
          appender: 'recording1',
        },
      },
      categories: {
        default: {
          appenders: ['filtered'],
          level: 'info',
        },
      },
    })

    const logger = log4js.getLogger()

    recording.reset()
    logger.info('normal message')
    logger.info('message with password')
    logger.info('another normal message')

    const events = recording.replay()
    t.equal(events.length, 2, 'messages with "password" should be filtered out')
    t.equal(events[0].data[0], 'normal message', 'first message should be recorded')
    t.equal(events[1].data[0], 'another normal message', 'third message should be recorded')

    log4js.shutdown()
    t.end()
  })

  batch.test('multiple nested filter appenders should load correctly', (t) => {
    // Test complex nested appender configuration
    log4js.configure({
      appenders: {
        recording1: { type: 'recording' },
        errorFilter: {
          type: 'logLevelFilter',
          appender: 'recording1',
          level: 'error',
        },
        categoryFiltered: {
          type: 'categoryFilter',
          exclude: ['test'],
          appender: 'errorFilter',
        },
      },
      categories: {
        default: {
          appenders: ['categoryFiltered'],
          level: 'debug',
        },
      },
    })

    const defaultLogger = log4js.getLogger()
    const testLogger = log4js.getLogger('test')

    recording.reset()
    defaultLogger.info('info from default')
    defaultLogger.error('error from default')
    testLogger.error('error from test')

    const events = recording.replay()
    t.equal(events.length, 1, 'only error from non-excluded category should be recorded')
    t.equal(events[0].level.toString(), 'ERROR', 'should be ERROR level')
    t.equal(events[0].data[0], 'error from default', 'should be from default category')

    log4js.shutdown()
    t.end()
  })

  batch.test('appender dependency loop should be detected', (t) => {
    // Test that circular dependencies are caught
    t.throws(() => {
      log4js.configure({
        appenders: {
          a: { type: 'logLevelFilter', appender: 'b', level: 'info' },
          b: { type: 'logLevelFilter', appender: 'a', level: 'info' },
        },
        categories: {
          default: { appenders: ['a'], level: 'info' },
        },
      })
    }, 'should throw error for circular dependency')

    log4js.shutdown()
    t.end()
  })

  batch.test('missing appender reference should throw error', (t) => {
    // Test that missing appender is detected
    t.throws(() => {
      log4js.configure({
        appenders: {
          filtered: { type: 'logLevelFilter', appender: 'nonexistent', level: 'info' },
        },
        categories: {
          default: { appenders: ['filtered'], level: 'info' },
        },
      })
    }, /not found/, 'should throw error for missing appender')

    log4js.shutdown()
    t.end()
  })

  batch.test('logLevelFilter with maxLevel should work correctly', (t) => {
    log4js.configure({
      appenders: {
        recording1: { type: 'recording' },
        warnOnly: {
          type: 'logLevelFilter',
          appender: 'recording1',
          level: 'warn',
          maxLevel: 'error',
        },
      },
      categories: {
        default: {
          appenders: ['warnOnly'],
          level: 'debug',
        },
      },
    })

    const logger = log4js.getLogger()

    recording.reset()
    logger.debug('debug message')
    logger.info('info message')
    logger.warn('warn message')
    logger.error('error message')
    logger.fatal('fatal message')

    const events = recording.replay()
    t.equal(events.length, 2, 'only WARN and ERROR should be recorded')
    t.equal(events[0].level.toString(), 'WARN', 'first should be WARN')
    t.equal(events[1].level.toString(), 'ERROR', 'second should be ERROR')

    log4js.shutdown()
    t.end()
  })

  batch.test('appenders should be initialized before category validation', (t) => {
    // This is the key test for the bug fix - ensures appenders are ready
    // before categories are validated
    t.doesNotThrow(() => {
      log4js.configure({
        appenders: {
          out: { type: 'stdout' },
          recording1: { type: 'recording' },
          errors: { type: 'logLevelFilter', appender: 'recording1', level: 'error' },
        },
        categories: {
          default: {
            appenders: ['out', 'errors'],
            level: 'info',
          },
        },
      })
    }, 'configuration with filter appenders should not throw')

    log4js.shutdown()
    t.end()
  })

  batch.end()
})
