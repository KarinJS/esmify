import { test } from 'tap'
import log4js from '../src/index'

test('configuration and shutdown test', (t) => {
  // 测试isConfigured
  const initialState = log4js.isConfigured()
  t.equal(typeof initialState, 'boolean', 'isConfigured should return boolean')

  // 测试shutdown
  t.doesNotThrow(() => {
    log4js.shutdown()
  }, 'shutdown should not throw without callback')

  t.doesNotThrow(() => {
    log4js.shutdown(() => {
      // callback
    })
  }, 'shutdown should not throw with callback')

  // 测试shutdown with invalid callback
  t.throws(() => {
    log4js.shutdown('invalid' as any)
  }, 'shutdown should throw with invalid callback')

  t.end()
})

test('recording appender test', (t) => {
  const recording = log4js.recording()

  t.ok(recording, 'recording should exist')
  t.equal(typeof recording.configure, 'function', 'recording should have configure method')
  t.equal(typeof recording.playback, 'function', 'recording should have playback method')
  t.equal(typeof recording.reset, 'function', 'recording should have reset method')
  t.equal(typeof recording.replay, 'function', 'recording should have replay method')

  t.end()
})

test('layouts test', (t) => {
  t.equal(typeof log4js.addLayout, 'function', 'addLayout should be a function')

  // 测试添加自定义布局
  t.doesNotThrow(() => {
    log4js.addLayout('test', (config) => {
      return (logEvent) => {
        return `[TEST] ${logEvent.data.join(' ')}`
      }
    })
  }, 'addLayout should not throw')

  t.end()
})
