import { test } from 'tap'
import Logger from '../src/logger.js'

test('Logger creation and basic properties', (t) => {
  const logger = new Logger('test')
  
  t.ok(logger)
  t.equal(logger.category, 'test')
  t.ok(logger.context)
  t.equal(typeof logger.addContext, 'function')
  t.equal(typeof logger.removeContext, 'function')
  t.equal(typeof logger.clearContext, 'function')
  
  t.end()
})

test('Logger context management', (t) => {
  const logger = new Logger('test')
  
  // Test adding context
  logger.addContext('user', 'testuser')
  logger.addContext('session', '12345')
  
  // Context should be accessible
  t.equal(logger.context.user, 'testuser')
  t.equal(logger.context.session, '12345')
  
  // Test removing context
  logger.removeContext('user')
  t.notOk(logger.context.user)
  t.equal(logger.context.session, '12345')
  
  // Test clearing all context
  logger.clearContext()
  t.notOk(logger.context.user)
  t.notOk(logger.context.session)
  
  t.end()
})

test('Logger call stack properties', (t) => {
  const logger = new Logger('test')
  
  // Test call stack related properties
  t.equal(typeof logger.callStackLinesToSkip, 'number')
  t.equal(typeof logger.useCallStack, 'boolean')
  
  // Test setting properties
  logger.callStackLinesToSkip = 5
  logger.useCallStack = true
  
  t.equal(logger.callStackLinesToSkip, 5)
  t.equal(logger.useCallStack, true)
  
  t.end()
})
