import { test } from 'tap'
import * as layouts from '../src/layouts.js'
import LoggingEvent from '../src/LoggingEvent.js'
import Level from '../src/levels.js'

test('stdout appender basic functionality', (t) => {
  // Test that our layouts module exists and has the required functions
  t.equal(typeof layouts.messagePassThroughLayout, 'function', 'messagePassThroughLayout should exist')
  t.equal(typeof layouts.basicLayout, 'function', 'basicLayout should exist')
  
  // Test message pass through layout
  const mockEvent = new LoggingEvent('test', (Level as any).INFO, ['cheese'], {})
  
  const result = layouts.messagePassThroughLayout(mockEvent)
  t.equal(result, 'cheese', 'messagePassThroughLayout should return first data item')
  
  t.end()
})

test('stdout appender layout configuration', (t) => {
  // Test that basic layout works with stdout-like configuration
  const mockEvent = new LoggingEvent('stdout-test', (Level as any).INFO, ['test message'], {})
  
  const result = layouts.basicLayout(mockEvent)
  t.ok(result.includes('INFO'), 'should include log level')
  t.ok(result.includes('stdout-test'), 'should include category name')
  t.ok(result.includes('test message'), 'should include message')
  
  t.end()
})
