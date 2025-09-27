import { test } from 'tap'
import Level from '../src/levels.js'

test('logLevelFilter concept', (t) => {
  // Test log level filter configuration structure
  const logLevelFilterConfig = {
    type: 'logLevelFilter',
    appender: 'fileAppender',
    level: 'ERROR',
    maxLevel: 'FATAL',
  }
  
  t.equal(logLevelFilterConfig.type, 'logLevelFilter', 'should have logLevelFilter type')
  t.equal(logLevelFilterConfig.appender, 'fileAppender', 'should reference target appender')
  t.equal(logLevelFilterConfig.level, 'ERROR', 'should have minimum level')
  t.equal(logLevelFilterConfig.maxLevel, 'FATAL', 'should have maximum level')
  
  t.end()
})

test('logLevelFilter level comparison concept', (t) => {
  // Test level filtering logic concept
  const filterLevel = (Level as any).ERROR
  const testLevels = [
    { level: (Level as any).DEBUG, name: 'DEBUG', shouldPass: false },
    { level: (Level as any).INFO, name: 'INFO', shouldPass: false },
    { level: (Level as any).WARN, name: 'WARN', shouldPass: false },
    { level: (Level as any).ERROR, name: 'ERROR', shouldPass: true },
    { level: (Level as any).FATAL, name: 'FATAL', shouldPass: true },
  ]
  
  testLevels.forEach((testCase) => {
    const passes = testCase.level.isGreaterThanOrEqualTo(filterLevel)
    t.equal(passes, testCase.shouldPass,
      `${testCase.name} should ${testCase.shouldPass ? 'pass' : 'not pass'} ERROR filter`)
  })
  
  t.end()
})

test('logLevelFilter range filtering concept', (t) => {
  // Test level range filtering (min and max levels)
  const minLevel = (Level as any).WARN
  const maxLevel = (Level as any).ERROR
  
  const testLevels = [
    { level: (Level as any).DEBUG, name: 'DEBUG', shouldPass: false },
    { level: (Level as any).INFO, name: 'INFO', shouldPass: false },
    { level: (Level as any).WARN, name: 'WARN', shouldPass: true },
    { level: (Level as any).ERROR, name: 'ERROR', shouldPass: true },
    { level: (Level as any).FATAL, name: 'FATAL', shouldPass: false },
  ]
  
  testLevels.forEach((testCase) => {
    const aboveMin = testCase.level.isGreaterThanOrEqualTo(minLevel)
    const belowMax = testCase.level.isLessThanOrEqualTo(maxLevel)
    const inRange = aboveMin && belowMax
    
    t.equal(inRange, testCase.shouldPass,
      `${testCase.name} should ${testCase.shouldPass ? 'be' : 'not be'} in WARN-ERROR range`)
  })
  
  t.end()
})

test('logLevelFilter configuration validation', (t) => {
  // Test configuration validation concepts
  const validConfigs = [
    { type: 'logLevelFilter', level: 'ERROR', appender: 'file' },
    { type: 'logLevelFilter', level: 'DEBUG', maxLevel: 'INFO', appender: 'console' },
    { type: 'logLevelFilter', level: 'WARN', appender: 'stdout' },
  ]
  
  const invalidConfigs = [
    { type: 'logLevelFilter' }, // missing level and appender
    { type: 'logLevelFilter', level: 'ERROR' }, // missing appender
    { level: 'ERROR', appender: 'file' }, // missing type
  ]
  
  validConfigs.forEach((config, index) => {
    t.ok(config.type === 'logLevelFilter', `Valid config ${index} should have correct type`)
    t.ok(config.level, `Valid config ${index} should have level`)
    t.ok(config.appender, `Valid config ${index} should have appender`)
  })
  
  invalidConfigs.forEach((config, index) => {
    const hasType = (config as any).type === 'logLevelFilter'
    const hasLevel = !!(config as any).level
    const hasAppender = !!(config as any).appender
    const isValid = hasType && hasLevel && hasAppender
    
    t.notOk(isValid, `Invalid config ${index} should be invalid`)
  })
  
  t.end()
})

test('logLevelFilter string level handling', (t) => {
  // Test string level conversion concept
  const stringLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']
  
  stringLevels.forEach((levelStr) => {
    const level = Level.getLevel(levelStr)
    t.ok(level, `Should convert string ${levelStr} to level object`)
    t.equal(level?.levelStr, levelStr, 'Converted level should have correct levelStr')
  })
  
  // Test case insensitive
  const lowerLevels = ['debug', 'info', 'warn', 'error', 'fatal']
  lowerLevels.forEach((levelStr) => {
    const level = Level.getLevel(levelStr)
    t.ok(level, `Should convert lowercase ${levelStr} to level object`)
    t.equal(level?.levelStr, levelStr.toUpperCase(), 'Should normalize to uppercase')
  })
  
  t.end()
})
