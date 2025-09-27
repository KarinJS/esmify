import { test } from 'tap'
import LoggingEvent from '../src/LoggingEvent.js'
import Level from '../src/levels.js'

test('LoggingEvent basic functionality', (t) => {
  // Test basic construction
  const event = new LoggingEvent('test', (Level as any).INFO, ['message'], {})
  t.ok(event)
  t.equal(event.categoryName, 'test')
  t.equal(event.level, (Level as any).INFO)
  t.same(event.data, ['message'])
  
  // Test serialization
  const serialized = event.serialise()
  t.ok(serialized)
  
  // Test deserialization
  const deserialized = LoggingEvent.deserialise(serialized)
  t.equal(deserialized.categoryName, 'test')
  t.equal(deserialized.level.levelStr, 'INFO')
  t.same(deserialized.data, ['message'])
  
  t.end()
})

test('LoggingEvent with complex data', (t) => {
  const complexData = {
    number: 42,
    string: 'test',
    array: [1, 2, 3],
    nested: { a: 1, b: 2 },
  }
  
  const event = new LoggingEvent('complex', (Level as any).DEBUG, [complexData], { user: 'test' })
  const serialized = event.serialise()
  const deserialized = LoggingEvent.deserialise(serialized)
  
  t.same(deserialized.data[0], complexData)
  t.same(deserialized.context, { user: 'test' })
  
  t.end()
})

test('LoggingEvent error handling', (t) => {
  const error = new Error('Test error')
  const event = new LoggingEvent('error', (Level as any).ERROR, [error], {})
  
  const serialized = event.serialise()
  const deserialized = LoggingEvent.deserialise(serialized)
  
  t.equal(deserialized.data[0].message, 'Test error')
  t.ok(deserialized.data[0].stack)
  
  t.end()
})
