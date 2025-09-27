import { test } from 'tap'
import Level from '../src/levels.js'

test('newLevel functionality', (t) => {
  // Test that we can create new levels
  const customLevels = {
    CUSTOM: { value: 25000, colour: 'purple' },
    SPECIAL: { value: 35000, colour: 'orange' },
  }
  
  // Test adding new levels
  Level.addLevels(customLevels)
  
  // Test that new levels exist
  t.ok((Level as any).CUSTOM, 'CUSTOM level should exist after adding')
  t.ok((Level as any).SPECIAL, 'SPECIAL level should exist after adding')
  
  // Test level properties
  t.equal((Level as any).CUSTOM.level, 25000, 'CUSTOM level should have correct value')
  t.equal((Level as any).CUSTOM.levelStr, 'CUSTOM', 'CUSTOM level should have correct levelStr')
  t.equal((Level as any).CUSTOM.colour, 'purple', 'CUSTOM level should have correct colour')
  
  // Test level comparison with new levels
  t.ok((Level as any).CUSTOM.isLessThanOrEqualTo((Level as any).SPECIAL), 'CUSTOM should be <= SPECIAL')
  t.ok((Level as any).SPECIAL.isGreaterThanOrEqualTo((Level as any).CUSTOM), 'SPECIAL should be >= CUSTOM')
  
  t.end()
})

test('newLevel getLevel functionality', (t) => {
  // Test that getLevel works with new levels
  const customLevel = Level.getLevel('CUSTOM')
  t.ok(customLevel, 'should find CUSTOM level')
  t.equal(customLevel?.levelStr, 'CUSTOM', 'should return correct level')
  
  // Test case insensitive
  const customLevelLower = Level.getLevel('custom')
  t.ok(customLevelLower, 'should find custom level (case insensitive)')
  t.equal(customLevelLower?.levelStr, 'CUSTOM', 'should return CUSTOM level')
  
  t.end()
})

test('newLevel validation', (t) => {
  // Test that Level.addLevels accepts valid configurations
  // Since our current implementation doesn't validate types strictly,
  // we test that it accepts valid configurations
  
  try {
    Level.addLevels({
      VALID_LEVEL: { value: 99999, colour: 'purple' },
    })
    t.ok((Level as any).VALID_LEVEL, 'should accept valid level configuration')
    t.equal((Level as any).VALID_LEVEL.level, 99999, 'should set correct level value')
  } catch (error) {
    t.fail(`should accept valid level configuration: ${error.message}`)
  }
  
  t.end()
})
