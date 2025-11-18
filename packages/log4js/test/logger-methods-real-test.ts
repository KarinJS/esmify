import { test } from 'tap'
import log4js, { recordingModule as recording } from '../src/index'

test('logger methods - real tests', (batch) => {
  batch.beforeEach(() => {
    log4js.configure({
      appenders: {
        rec: { type: 'recording' },
      },
      categories: {
        default: { appenders: ['rec'], level: 'trace' },
      },
    })
    recording.reset()
  })

  batch.afterEach(() => {
    log4js.shutdown()
  })

  batch.test('logger should have all standard level methods', (t) => {
    const logger = log4js.getLogger()

    t.equal(typeof logger.trace, 'function', 'should have trace method')
    t.equal(typeof logger.debug, 'function', 'should have debug method')
    t.equal(typeof logger.info, 'function', 'should have info method')
    t.equal(typeof logger.warn, 'function', 'should have warn method')
    t.equal(typeof logger.error, 'function', 'should have error method')
    t.equal(typeof logger.fatal, 'function', 'should have fatal method')

    t.end()
  })

  batch.test('logger should have all isXxxEnabled methods', (t) => {
    const logger = log4js.getLogger()

    t.equal(typeof logger.isTraceEnabled, 'function', 'should have isTraceEnabled method')
    t.equal(typeof logger.isDebugEnabled, 'function', 'should have isDebugEnabled method')
    t.equal(typeof logger.isInfoEnabled, 'function', 'should have isInfoEnabled method')
    t.equal(typeof logger.isWarnEnabled, 'function', 'should have isWarnEnabled method')
    t.equal(typeof logger.isErrorEnabled, 'function', 'should have isErrorEnabled method')
    t.equal(typeof logger.isFatalEnabled, 'function', 'should have isFatalEnabled method')

    t.end()
  })

  batch.test('trace method should log correctly', (t) => {
    const logger = log4js.getLogger()
    logger.trace('trace message')

    const events = recording.replay()
    t.equal(events.length, 1, 'should record one event')
    t.equal(events[0].level.toString(), 'TRACE', 'should be TRACE level')
    t.equal(events[0].data[0], 'trace message', 'should have correct message')

    t.end()
  })

  batch.test('debug method should log correctly', (t) => {
    const logger = log4js.getLogger()
    logger.debug('debug message')

    const events = recording.replay()
    t.equal(events.length, 1, 'should record one event')
    t.equal(events[0].level.toString(), 'DEBUG', 'should be DEBUG level')
    t.equal(events[0].data[0], 'debug message', 'should have correct message')

    t.end()
  })

  batch.test('info method should log correctly', (t) => {
    const logger = log4js.getLogger()
    logger.info('info message')

    const events = recording.replay()
    t.equal(events.length, 1, 'should record one event')
    t.equal(events[0].level.toString(), 'INFO', 'should be INFO level')
    t.equal(events[0].data[0], 'info message', 'should have correct message')

    t.end()
  })

  batch.test('warn method should log correctly', (t) => {
    const logger = log4js.getLogger()
    logger.warn('warn message')

    const events = recording.replay()
    t.equal(events.length, 1, 'should record one event')
    t.equal(events[0].level.toString(), 'WARN', 'should be WARN level')
    t.equal(events[0].data[0], 'warn message', 'should have correct message')

    t.end()
  })

  batch.test('error method should log correctly', (t) => {
    const logger = log4js.getLogger()
    logger.error('error message')

    const events = recording.replay()
    t.equal(events.length, 1, 'should record one event')
    t.equal(events[0].level.toString(), 'ERROR', 'should be ERROR level')
    t.equal(events[0].data[0], 'error message', 'should have correct message')

    t.end()
  })

  batch.test('fatal method should log correctly', (t) => {
    const logger = log4js.getLogger()
    logger.fatal('fatal message')

    const events = recording.replay()
    t.equal(events.length, 1, 'should record one event')
    t.equal(events[0].level.toString(), 'FATAL', 'should be FATAL level')
    t.equal(events[0].data[0], 'fatal message', 'should have correct message')

    t.end()
  })

  batch.test('logger should log multiple arguments', (t) => {
    const logger = log4js.getLogger()
    logger.info('message', 'arg1', 'arg2', 123)

    const events = recording.replay()
    t.equal(events.length, 1, 'should record one event')
    t.same(events[0].data, ['message', 'arg1', 'arg2', 123], 'should have all arguments')

    t.end()
  })

  batch.test('logger should respect level filtering', (t) => {
    // Reconfigure with INFO level
    log4js.configure({
      appenders: {
        rec: { type: 'recording' },
      },
      categories: {
        default: { appenders: ['rec'], level: 'info' },
      },
    })
    recording.reset()

    const logger = log4js.getLogger()
    logger.trace('trace message')
    logger.debug('debug message')
    logger.info('info message')
    logger.warn('warn message')

    const events = recording.replay()
    t.equal(events.length, 2, 'should only record INFO and WARN')
    t.equal(events[0].level.toString(), 'INFO', 'first should be INFO')
    t.equal(events[1].level.toString(), 'WARN', 'second should be WARN')

    t.end()
  })

  batch.test('isXxxEnabled should return correct values', (t) => {
    // Reconfigure with WARN level
    log4js.configure({
      appenders: {
        rec: { type: 'recording' },
      },
      categories: {
        default: { appenders: ['rec'], level: 'warn' },
      },
    })

    const logger = log4js.getLogger()

    t.notOk(logger.isTraceEnabled(), 'TRACE should be disabled')
    t.notOk(logger.isDebugEnabled(), 'DEBUG should be disabled')
    t.notOk(logger.isInfoEnabled(), 'INFO should be disabled')
    t.ok(logger.isWarnEnabled(), 'WARN should be enabled')
    t.ok(logger.isErrorEnabled(), 'ERROR should be enabled')
    t.ok(logger.isFatalEnabled(), 'FATAL should be enabled')

    t.end()
  })

  batch.test('logger.level should be readable and writable', (t) => {
    const logger = log4js.getLogger()

    t.equal(logger.level.toString(), 'TRACE', 'initial level should be TRACE')

    logger.level = 'ERROR'
    t.equal(logger.level.toString(), 'ERROR', 'level should be changed to ERROR')

    t.notOk(logger.isInfoEnabled(), 'INFO should be disabled after level change')
    t.ok(logger.isErrorEnabled(), 'ERROR should be enabled after level change')

    t.end()
  })

  batch.test('logger should handle Error objects', (t) => {
    const logger = log4js.getLogger()
    const error = new Error('test error')

    logger.error('Error occurred:', error)

    const events = recording.replay()
    t.equal(events.length, 1, 'should record one event')
    t.equal(events[0].data[0], 'Error occurred:', 'should have message')
    t.ok(events[0].data[1] instanceof Error, 'should have Error object')

    t.end()
  })

  batch.test('logger context methods should work', (t) => {
    const logger = log4js.getLogger()

    t.equal(typeof logger.addContext, 'function', 'should have addContext method')
    t.equal(typeof logger.removeContext, 'function', 'should have removeContext method')
    t.equal(typeof logger.clearContext, 'function', 'should have clearContext method')

    logger.addContext('user', 'testuser')
    logger.addContext('requestId', '12345')
    logger.info('test message')

    const events = recording.replay()
    t.equal(events.length, 1, 'should record one event')
    t.same(events[0].context, { user: 'testuser', requestId: '12345' }, 'should have context')

    logger.removeContext('user')
    recording.reset()
    logger.info('test message 2')

    const events2 = recording.replay()
    t.same(events2[0].context, { requestId: '12345' }, 'should have removed user from context')

    logger.clearContext()
    recording.reset()
    logger.info('test message 3')

    const events3 = recording.replay()
    t.same(events3[0].context, {}, 'should have cleared all context')

    t.end()
  })

  batch.test('logger category should be set correctly', (t) => {
    const logger1 = log4js.getLogger()
    const logger2 = log4js.getLogger('custom')
    const logger3 = log4js.getLogger('app.database')

    logger1.info('message 1')
    logger2.info('message 2')
    logger3.info('message 3')

    const events = recording.replay()
    t.equal(events.length, 3, 'should record three events')
    t.equal(events[0].categoryName, 'default', 'first should be default category')
    t.equal(events[1].categoryName, 'custom', 'second should be custom category')
    t.equal(events[2].categoryName, 'app.database', 'third should be app.database category')

    t.end()
  })

  batch.end()
})
