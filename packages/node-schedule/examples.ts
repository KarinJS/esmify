/**
 * Node-Schedule ESM + TypeScript 使用示例
 * 
 * 本文件展示如何在 TypeScript/ESM 项目中使用 node-schedule
 */

import { scheduleJob, Job, RecurrenceRule, Range, cancelJob } from './src/index'

// 示例 1: 调度一次性任务
console.log('示例 1: 调度一次性任务')
const date = new Date(Date.now() + 5000)
const job1 = scheduleJob(date, function () {
  console.log('✓ 5秒后执行的一次性任务')
})

// 示例 2: 使用名称调度任务
console.log('\n示例 2: 使用名称调度任务')
const job2 = scheduleJob('my-named-job', new Date(Date.now() + 3000), function () {
  console.log('✓ 命名任务执行')
})

// 示例 3: 使用 RecurrenceRule 创建循环任务
console.log('\n示例 3: 使用 RecurrenceRule')
const rule = new RecurrenceRule()
rule.second = 10 // 每分钟的第10秒执行

const job3 = scheduleJob(rule, function () {
  console.log('✓ 循环任务执行 - 每分钟第10秒')
})

// 示例 4: 使用 cron 表达式
console.log('\n示例 4: 使用 cron 表达式')
const job4 = scheduleJob('*/5 * * * * *', function () {
  console.log('✓ 每5秒执行一次')
})

// 示例 5: 使用 Range
console.log('\n示例 5: 使用 Range 创建复杂规则')
const complexRule = new RecurrenceRule()
complexRule.hour = new Range(0, 23, 2) // 每隔2小时
complexRule.minute = 0

const job5 = scheduleJob(complexRule, function () {
  console.log('✓ 每隔2小时执行')
})

// 示例 6: 手动创建 Job 实例
console.log('\n示例 6: 手动创建 Job 实例')
const job6 = new Job('manual-job', function () {
  console.log('✓ 手动创建的任务')
})
job6.schedule(new Date(Date.now() + 2000))

// 示例 7: 取消任务
setTimeout(() => {
  console.log('\n示例 7: 取消任务')
  cancelJob('my-named-job')
  console.log('✓ 已取消 my-named-job')

  // 也可以直接取消 job 实例
  if (job4) {
    job4.cancel()
    console.log('✓ 已取消 cron 任务')
  }
}, 10000)

// 示例 8: 监听事件
console.log('\n示例 8: 监听任务事件')
const eventJob = scheduleJob(new Date(Date.now() + 1000), function () {
  return 'task result'
})

if (eventJob) {
  eventJob.on('scheduled', function (date) {
    console.log('✓ 任务已调度:', date)
  })

  eventJob.on('run', function () {
    console.log('✓ 任务正在运行')
  })

  eventJob.on('success', function (result) {
    console.log('✓ 任务成功完成:', result)
  })

  eventJob.on('error', function (err) {
    console.error('✗ 任务执行错误:', err)
  })

  eventJob.on('canceled', function () {
    console.log('✓ 任务已取消')
  })
}

// 示例 9: 使用对象配置
console.log('\n示例 9: 使用对象配置')
const job9 = scheduleJob({
  hour: 14,
  minute: 30,
  dayOfWeek: [0, 1, 2, 3, 4, 5, 6] // 每天
}, function () {
  console.log('✓ 每天14:30执行')
})

// 示例 10: 异步任务
console.log('\n示例 10: 异步任务')
const asyncJob = scheduleJob(new Date(Date.now() + 6000), async function () {
  console.log('✓ 开始异步任务')
  await new Promise(resolve => setTimeout(resolve, 1000))
  console.log('✓ 异步任务完成')
  return 'async result'
})

if (asyncJob) {
  asyncJob.on('success', function (result) {
    console.log('✓ 异步任务结果:', result)
  })
}

console.log('\n所有示例任务已设置，等待执行...\n')

// 优雅关闭示例（通常在应用关闭时使用）
process.on('SIGINT', async () => {
  console.log('\n正在优雅关闭...')
  const { gracefulShutdown } = await import('./src/index.js')
  await gracefulShutdown()
  console.log('所有任务已取消，应用关闭。')
  process.exit(0)
})
