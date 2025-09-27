import { test } from 'tap'
import Logger from '../src/logger'
import Level from '../src/levels'
import LoggingEvent from '../src/LoggingEvent'

test('Logger class direct test', (t) => {
  // 测试Logger构造
  const logger = new Logger('test-direct')
  
  t.ok(logger, 'Logger should be created')
  t.equal(logger.category, 'test-direct', 'Logger should have correct category')
  t.ok(logger.context, 'Logger should have context object')
  t.equal(typeof logger.context, 'object', 'context should be object')
  
  // 测试context方法
  logger.addContext('testKey', 'testValue')
  t.equal(logger.context.testKey, 'testValue', 'addContext should work')
  
  logger.removeContext('testKey')
  t.notOk(logger.context.testKey, 'removeContext should work')
  
  logger.addContext('key1', 'value1')
  logger.addContext('key2', 'value2')
  logger.clearContext()
  t.notOk(logger.context.key1, 'clearContext should clear all')
  t.notOk(logger.context.key2, 'clearContext should clear all')
  
  // 测试callStack相关方法
  t.equal(typeof logger.callStackLinesToSkip, 'number', 'callStackLinesToSkip should be number')
  t.equal(typeof logger.useCallStack, 'boolean', 'useCallStack should be boolean')
  
  logger.callStackLinesToSkip = 5
  t.equal(logger.callStackLinesToSkip, 5, 'should set callStackLinesToSkip')
  
  logger.useCallStack = true
  t.equal(logger.useCallStack, true, 'should set useCallStack')
  
  // 测试parseCallStack函数
  t.doesNotThrow(() => {
    logger.setParseCallStackFunction((error, skipIdx) => {
      return {
        fileName: 'test.ts',
        lineNumber: 42,
        columnNumber: 10,
        callStack: 'test stack',
        className: 'TestClass',
        functionName: 'testFunction',
        functionAlias: 'alias',
        callerName: 'caller'
      }
    })
  }, 'setParseCallStackFunction should work')
  
  t.doesNotThrow(() => {
    logger.setParseCallStackFunction() // reset to default
  }, 'setParseCallStackFunction with undefined should work')
  
  t.throws(() => {
    logger.setParseCallStackFunction('invalid' as any)
  }, 'setParseCallStackFunction should validate input')
  
  t.end()
})

test('LoggingEvent direct test', (t) => {
  // 基本创建
  const event = new LoggingEvent('test-category', (Level as any).INFO, ['test message'])
  
  t.ok(event, 'LoggingEvent should be created')
  t.equal(event.categoryName, 'test-category', 'should have correct category')
  t.equal(event.level, (Level as any).INFO, 'should have correct level')
  t.deepEqual(event.data, ['test message'], 'should have correct data')
  t.ok(event.startTime instanceof Date, 'should have startTime as Date')
  t.equal(typeof event.pid, 'number', 'should have pid as number')
  
  // 带context的创建
  const context = { userId: 123, sessionId: 'abc' }
  const event2 = new LoggingEvent('test', (Level as any).ERROR, ['error'], context)
  t.deepEqual(event2.context, context, 'should have context')
  
  // 带location的创建
  const location = {
    fileName: 'test.ts',
    lineNumber: 42,
    columnNumber: 10,
    callStack: 'test stack',
    className: 'TestClass',
    functionName: 'testFunction',
    functionAlias: 'alias',
    callerName: 'caller'
  }
  
  const event3 = new LoggingEvent('test', (Level as any).WARN, ['warning'], undefined, location)
  t.equal(event3.fileName, 'test.ts', 'should have location data')
  t.equal(event3.lineNumber, 42, 'should have location data')
  
  // 序列化测试
  const serialized = event.serialise()
  t.ok(typeof serialized === 'string', 'serialise should return string')
  
  const deserialized = LoggingEvent.deserialise(serialized)
  t.ok(deserialized instanceof LoggingEvent, 'deserialise should return LoggingEvent')
  t.equal(deserialized.categoryName, 'test-category', 'deserialized should have correct data')
  
  // 无效location测试
  t.throws(() => {
    new LoggingEvent('test', (Level as any).INFO, ['message'], undefined, [] as any)
  }, 'should throw for invalid location')
  
  t.end()
})

test('Level class direct test', (t) => {
  // 测试Level构造
  const customLevel = new Level(15000, 'CUSTOM', 'purple')
  t.ok(customLevel, 'Level should be created')
  t.equal(customLevel.level, 15000, 'should have correct level value')
  t.equal(customLevel.levelStr, 'CUSTOM', 'should have correct level string')
  t.equal(customLevel.colour, 'purple', 'should have correct colour')
  
  // 测试toString
  t.equal(customLevel.toString(), 'CUSTOM', 'toString should return levelStr')
  
  // 测试比较方法
  const LevelAny = Level as any
  const debug = LevelAny.DEBUG
  const info = LevelAny.INFO
  
  t.ok(debug.isLessThanOrEqualTo(info), 'isLessThanOrEqualTo should work')
  t.ok(info.isGreaterThanOrEqualTo(debug), 'isGreaterThanOrEqualTo should work') 
  t.ok(debug.isEqualTo('DEBUG'), 'isEqualTo should work with string')
  t.ok(debug.isEqualTo(debug), 'isEqualTo should work with Level')
  
  // 测试getLevel
  t.equal(Level.getLevel('DEBUG'), debug, 'getLevel should work')
  t.equal(Level.getLevel(debug), debug, 'getLevel should work with Level')
  t.equal(Level.getLevel('invalid'), undefined, 'getLevel should return undefined for invalid')
  t.equal(Level.getLevel('invalid', info), info, 'getLevel should return default for invalid')
  
  // 测试addLevels
  t.doesNotThrow(() => {
    Level.addLevels({
      'TEST': { value: 25000, colour: 'orange' }
    })
  }, 'addLevels should work')
  
  t.equal((Level as any).TEST.levelStr, 'TEST', 'addLevels should add new level')
  
  t.end()
})
