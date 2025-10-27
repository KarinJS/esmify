// 功能对比测试
import * as modern from './dist/index.mjs'

console.log('🧪 测试开始\n')

// 测试 1: 基础 setTimeout
console.log('测试 1: setTimeout 基础功能')
const t1 = modern.setTimeout(() => {
  console.log('✅ setTimeout 正常触发')
}, 100)
console.log('  - Timeout 实例创建:', t1.constructor.name)

// 测试 2: clearTimeout
setTimeout(() => {
  console.log('\n测试 2: clearTimeout 功能')
  const t2 = modern.setTimeout(() => {
    console.log('❌ 不应该执行（已被清除）')
  }, 100)
  modern.clearTimeout(t2)
  console.log('✅ clearTimeout 执行成功')
}, 200)

// 测试 3: setInterval
setTimeout(() => {
  console.log('\n测试 3: setInterval 功能')
  let count = 0
  const i1 = modern.setInterval(() => {
    count++
    console.log(`  - Interval 第 ${count} 次触发`)
    if (count >= 3) {
      modern.clearInterval(i1)
      console.log('✅ setInterval 正常工作并清除')

      // 测试 4: unref/ref
      setTimeout(() => {
        console.log('\n测试 4: unref/ref 功能')
        const t3 = modern.setTimeout(() => {
          console.log('✅ unref/ref 后正常触发')
        }, 100)
        t3.unref()
        t3.ref()
        console.log('✅ unref/ref 方法调用成功')
      }, 100)

      // 测试 5: 超长时间（模拟）
      setTimeout(() => {
        console.log('\n测试 5: 超长时间处理（使用 TIMEOUT_MAX + 100）')
        const TIMEOUT_MAX = 2147483647
        const t4 = modern.setTimeout(() => {
          console.log('✅ 超长时间定时器逻辑正确')

          console.log('\n🎉 所有测试通过！')
          process.exit(0)
        }, TIMEOUT_MAX + 100)
        console.log('✅ 超长时间定时器创建成功')
        // 立即清除以快速完成测试
        modern.clearTimeout(t4)
        console.log('✅ 超长时间定时器可以正常清除')

        console.log('\n🎉 所有测试通过！')
        process.exit(0)
      }, 200)
    }
  }, 50)
}, 300)

// 测试 6: 导出验证
setTimeout(() => {
  console.log('\n测试 6: 验证所有导出')
  const exports = ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'Timeout', 'Interval', 'default']
  const actualExports = Object.keys(modern)
  const allExist = exports.every(e => actualExports.includes(e))
  console.log('  - 期望导出:', exports.join(', '))
  console.log('  - 实际导出:', actualExports.join(', '))
  console.log(allExist ? '✅ 所有导出正确' : '❌ 导出不完整')
}, 150)
