import { Job, scheduledJobs } from './Job'
import type { RecurrenceRule } from './Invocation'

/*
  node-schedule
  A cron-like and not-cron-like job scheduler for Node.
*/

/* API
  invoke()
  runOnDate(date)
  schedule(date || recurrenceRule || cronstring)
  cancel(reschedule = false)
  cancelNext(reschedule = true)

   Property constraints
  name: readonly
  job: readwrite
*/

type ScheduleSpec = string | Date | RecurrenceRule | Record<string, unknown>
type JobMethod = (fireDate?: Date) => unknown
type JobCallbackFn = () => void

/* Convenience methods */
export function scheduleJob (
  spec: ScheduleSpec,
  method: JobMethod
): Job | null
export function scheduleJob (
  name: string,
  spec: ScheduleSpec,
  method: JobMethod
): Job | null
export function scheduleJob (
  nameOrSpec: string | ScheduleSpec,
  specOrMethod: ScheduleSpec | JobMethod,
  methodOrCallback?: JobMethod | JobCallbackFn,
  callback?: JobCallbackFn
): Job | null {
  if (arguments.length < 2) {
    throw new RangeError('Invalid number of arguments')
  }

  const name =
    arguments.length >= 3 && typeof nameOrSpec === 'string'
      ? nameOrSpec
      : null
  const spec = name ? specOrMethod : nameOrSpec
  const method = name ? methodOrCallback : specOrMethod
  const cb = name ? callback : methodOrCallback

  if (typeof method !== 'function') {
    throw new RangeError('The job method must be a function.')
  }

  const job = new Job(
    name ?? undefined,
    method as JobMethod,
    cb as JobCallbackFn | undefined
  )

  if (job.schedule(spec as ScheduleSpec)) {
    return job
  }

  return null
}

export function rescheduleJob (
  job: Job | string,
  spec: ScheduleSpec
): Job | null {
  if (job instanceof Job) {
    if (job.reschedule(spec)) {
      return job
    }
  } else if (typeof job === 'string') {
    if (Object.prototype.hasOwnProperty.call(scheduledJobs, job)) {
      if (scheduledJobs[job].reschedule(spec)) {
        return scheduledJobs[job]
      }
    } else {
      throw new Error(
        'Cannot reschedule one-off job by name, pass job reference instead'
      )
    }
  }
  return null
}

export function cancelJob (job: Job | string): boolean {
  let success = false
  if (job instanceof Job) {
    success = job.cancel()
  } else if (typeof job === 'string') {
    if (
      job in scheduledJobs &&
      Object.prototype.hasOwnProperty.call(scheduledJobs, job)
    ) {
      success = scheduledJobs[job].cancel()
    }
  }

  return success
}

export async function gracefulShutdown (): Promise<void> {
  const jobs = Object.keys(scheduledJobs).map((key) => scheduledJobs[key])
  jobs.forEach(function (job) {
    job.cancel()
  })

  let running = false
  for (let i = 0; i < jobs.length; i++) {
    if (jobs[i].running > 0) {
      running = true
      break
    }
  }

  return new Promise<void>(function (resolve) {
    if (running) {
      const intervalId = setInterval(function () {
        for (let i = 0; i < jobs.length; i++) {
          if (jobs[i].running > 0) {
            return
          }
        }
        clearInterval(intervalId)
        resolve()
      }, 500)
    } else {
      resolve()
    }
  })
}

export { scheduledJobs }
