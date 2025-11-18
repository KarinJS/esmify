import { test } from 'tap'
import { basicLayout, colouredLayout, messagePassThroughLayout, dummyLayout, LoggingEvent, Level } from '../src/index'

test('layouts - basicLayout', (t) => {
  const event = new LoggingEvent('cheese', (Level as any).INFO, ['log message'], {})
  event.startTime = new Date(2010, 11, 5, 14, 18, 30, 45)

  const result = basicLayout(event)
  t.match(result, /^\[2010-12-05T\d{2}:18:30\.\d{3}\] \[INFO\] cheese - log message$/)

  t.end()
})

test('layouts - colouredLayout', (t) => {
  const event = new LoggingEvent('cheese', (Level as any).ERROR, ['log message'], {})
  event.startTime = new Date(2010, 11, 5, 14, 18, 30, 45)

  const result = colouredLayout(event)
  // Should contain ANSI color codes
  t.ok(result.includes('\x1B['))
  t.ok(result.includes('ERROR'))
  t.ok(result.includes('cheese'))
  t.ok(result.includes('log message'))

  t.end()
})

test('layouts - messagePassThroughLayout', (t) => {
  const event = new LoggingEvent('cheese', (Level as any).INFO, ['log message'], {})

  const result = messagePassThroughLayout(event)
  t.equal(result, 'log message')

  t.end()
})

test('layouts - dummyLayout', (t) => {
  const event = new LoggingEvent('cheese', (Level as any).INFO, ['log message'], {})

  const result = dummyLayout(event)
  t.equal(result, 'log message')

  t.end()
})

test('layouts - handle multiple arguments', (t) => {
  const event = new LoggingEvent('test', (Level as any).DEBUG, ['message', 42, { key: 'value' }], {})

  const result = basicLayout(event)
  t.ok(result.includes('message'))
  t.ok(result.includes('42'))
  t.ok(result.includes('key'))
  t.ok(result.includes('value'))

  t.end()
})

test('layouts - handle error objects', (t) => {
  const error = new Error('Test error')
  const event = new LoggingEvent('error', (Level as any).ERROR, [error], {})

  const result = basicLayout(event)
  t.ok(result.includes('Error: Test error'))

  t.end()
})
