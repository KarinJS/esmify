import { test } from 'tap'
import log4js from '../src/log4js.js'

test('recording appender functionality', (t) => {
  // Test that recording function exists
  t.equal(typeof log4js.recording, 'function', 'recording should be a function')
  
  // Test recording appender basic methods
  const recording = log4js.recording()
  t.ok(recording, 'recording should return an object')
  t.equal(typeof recording.configure, 'function', 'recording should have configure method')
  t.equal(typeof recording.playback, 'function', 'recording should have playback method')
  t.equal(typeof recording.reset, 'function', 'recording should have reset method')
  t.equal(typeof recording.replay, 'function', 'recording should have replay method')
  
  t.end()
})

test('recording appender basic operations', (t) => {
  const recording = log4js.recording()
  
  // Test initial state
  const initialEvents = recording.playback()
  t.ok(Array.isArray(initialEvents), 'playback should return an array')
  t.equal(initialEvents.length, 0, 'initial events should be empty')
  
  // Test reset
  recording.reset()
  const eventsAfterReset = recording.playback()
  t.equal(eventsAfterReset.length, 0, 'events should still be empty after reset')
  
  // Test replay (should be same as playback)
  const replayEvents = recording.replay()
  t.same(replayEvents, eventsAfterReset, 'replay should return same as playback')
  
  t.end()
})
