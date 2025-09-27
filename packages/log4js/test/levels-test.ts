import { test } from 'tap'
import Level from '../src/levels'

test('levels basic test', (t) => {
  // 测试默认levels是否存在
  t.ok(Level, 'Level class should exist')
  
  // 测试静态levels - 使用any类型断言因为动态添加的属性
  const LevelAny = Level as any
  t.ok(LevelAny.ALL, 'ALL level should exist')
  t.ok(LevelAny.TRACE, 'TRACE level should exist')
  t.ok(LevelAny.DEBUG, 'DEBUG level should exist')
  t.ok(LevelAny.INFO, 'INFO level should exist')
  t.ok(LevelAny.WARN, 'WARN level should exist')
  t.ok(LevelAny.ERROR, 'ERROR level should exist')
  t.ok(LevelAny.FATAL, 'FATAL level should exist')
  t.ok(LevelAny.OFF, 'OFF level should exist')
  
  // 测试getLevel方法
  t.equal(Level.getLevel('DEBUG'), LevelAny.DEBUG, 'should get DEBUG level')
  t.equal(Level.getLevel('debug'), LevelAny.DEBUG, 'should be case insensitive')
  t.equal(Level.getLevel('INFO'), LevelAny.INFO, 'should get INFO level')
  
  // 测试level比较
  const debug = LevelAny.DEBUG
  const info = LevelAny.INFO
  
  t.ok(debug.isLessThanOrEqualTo(info), 'DEBUG should be <= INFO')
  t.ok(info.isGreaterThanOrEqualTo(debug), 'INFO should be >= DEBUG')
  t.ok(debug.isEqualTo('DEBUG'), 'DEBUG should equal "DEBUG" string')
  
  t.end()
})
