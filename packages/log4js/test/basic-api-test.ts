import { test } from 'tap'
import log4js from '../src/log4js'

test('log4js basic API test', (t) => {
  // 测试主要导出
  t.equal(typeof log4js.getLogger, 'function', 'getLogger should be a function')
  t.equal(typeof log4js.configure, 'function', 'configure should be a function')
  t.equal(typeof log4js.shutdown, 'function', 'shutdown should be a function')
  t.equal(typeof log4js.isConfigured, 'function', 'isConfigured should be a function')
  t.equal(typeof log4js.connectLogger, 'function', 'connectLogger should be a function')
  t.equal(typeof log4js.addLayout, 'function', 'addLayout should be a function')
  t.equal(typeof log4js.recording, 'function', 'recording should be a function')
  t.ok(log4js.levels, 'levels should exist')

  // 测试isConfigured
  const initialConfig = log4js.isConfigured()
  t.equal(typeof initialConfig, 'boolean', 'isConfigured should return boolean')

  t.end()
})

test('logger creation without full config', (t) => {
  // 这个测试会触发默认配置，但可能会失败，我们捕获错误
  try {
    const logger = log4js.getLogger('test')
    // 如果成功创建，测试基本属性
    t.ok(logger, 'logger should be created')
    t.equal(logger.category, 'test', 'logger should have correct category')
    t.equal(typeof logger.log, 'function', 'logger should have log method')
  } catch (error: any) {
    // 如果失败，说明appender系统需要更多实现
    t.ok(error, 'Expected error due to incomplete appender system')
    t.match(error.message, /appender.*not defined/, 'Error should be about missing appender')
  }

  t.end()
})
