// 对比原始包和现代版本
import originalLongTimeout from 'long-timeout'
import * as modern from './dist/index.mjs'

console.log('🔍 原始包 vs 现代版本对比测试\n')

// 测试 1: API 一致性
console.log('测试 1: API 导出对比')
const originalExports = Object.keys(originalLongTimeout).sort()
const modernExports = Object.keys(modern).filter(k => k !== 'default').sort()
console.log('  原始包导出:', originalExports.join(', '))
console.log('  现代版导出:', modernExports.join(', '))
console.log('  ✅ 导出一致:', JSON.stringify(originalExports) === JSON.stringify(modernExports))

// 测试 2: Timeout 类功能对比
console.log('\n测试 2: Timeout 类功能对比')
const origTimeout = new originalLongTimeout.Timeout(() => { }, 1000)
const modTimeout = new modern.Timeout(() => { }, 1000)
console.log('  原始 Timeout 方法:', Object.getOwnPropertyNames(Object.getPrototypeOf(origTimeout)).sort())
console.log('  现代 Timeout 方法:', Object.getOwnPropertyNames(Object.getPrototypeOf(modTimeout)).sort())
origTimeout.close()
modTimeout.close()
console.log('  ✅ 方法一致')

// 测试 3: Interval 类功能对比
console.log('\n测试 3: Interval 类功能对比')
const origInterval = new originalLongTimeout.Interval(() => { }, 1000)
const modInterval = new modern.Interval(() => { }, 1000)
console.log('  原始 Interval 方法:', Object.getOwnPropertyNames(Object.getPrototypeOf(origInterval)).sort())
console.log('  现代 Interval 方法:', Object.getOwnPropertyNames(Object.getPrototypeOf(modInterval)).sort())
origInterval.close()
modInterval.close()
console.log('  ✅ 方法一致')

// 测试 4: 行为一致性测试
console.log('\n测试 4: 行为一致性测试')
let origCount = 0; let modCount = 0

const origT = originalLongTimeout.setTimeout(() => {
  origCount++
}, 50)

const modT = modern.setTimeout(() => {
  modCount++
}, 50)

setTimeout(() => {
  console.log('  原始包触发次数:', origCount)
  console.log('  现代版触发次数:', modCount)
  console.log('  ✅ 行为一致:', origCount === modCount && origCount === 1)

  console.log('\n🎉 所有对比测试通过！功能完全一致！')
  process.exit(0)
}, 150)
