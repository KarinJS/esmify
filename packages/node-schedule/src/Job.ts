import { EventEmitter } from 'events'
import {
  CronExpressionParser,
  CronDate,
  type CronExpression as CronExpr,
} from '@karinjs/cron-parser'

import {
  scheduleNextRecurrence,
  scheduleInvocation,
  cancelInvocation,
  RecurrenceRule,
  sorter,
  Invocation,
} from './Invocation'
import { isValidDate } from './utils/dateUtils'
import * as sorted from './utils/sortedArray'

export const scheduledJobs: Record<string, Job> = {}

let anonJobCounter = 0
function resolveAnonJobName (): string {
  const now = new Date()
  if (anonJobCounter === Number.MAX_SAFE_INTEGER) {
    anonJobCounter = 0
  }
  anonJobCounter++

  return `<Anonymous Job ${anonJobCounter} ${now.toISOString()}>`
}

type JobFunction = (fireDate?: Date) => unknown
type JobCallback = () => void

interface RecurrenceSpec {
  year?: number | number[]
  month?: number | number[]
  date?: number | number[]
  dayOfWeek?: number | number[]
  hour?: number | number[]
  minute?: number | number[]
  second?: number | number[]
}

interface ScheduleSpec {
  rule: string | Date | RecurrenceRule | RecurrenceSpec
  start?: Date | string
  end?: Date | string
  tz?: string
}

export class Job extends EventEmitter {
  readonly name!: string
  job: JobFunction
  callback: JobCallback | false
  running: number = 0
  isOneTimeJob: boolean = false
  private pendingInvocations: Invocation[] = []
  private triggeredJobsCount: number = 0

  constructor (name?: string | JobFunction, job?: JobFunction | JobCallback, callback?: JobCallback) {
    super()

    // Set scope vars
    const jobName =
      name && typeof name === 'string' ? name : resolveAnonJobName()
    this.job = (name && typeof name === 'function' ? name : job) as JobFunction

    // Make sure callback is actually a callback
    if (this.job === name) {
      // Name wasn't provided and maybe a callback is there
      this.callback = typeof job === 'function' ? (job as JobCallback) : false
    } else {
      // Name was provided, and maybe a callback is there
      this.callback = typeof callback === 'function' ? callback : false
    }

    // Check for generator
    if (
      typeof this.job === 'function' &&
      this.job.prototype &&
      'next' in this.job.prototype
    ) {
      const generator = this.job.call(this) as Iterator<unknown>
      this.job = function () {
        return generator.next().value
      }
    }

    // define properties
    Object.defineProperty(this, 'name', {
      value: jobName,
      writable: false,
      enumerable: true,
    })
  }

  trackInvocation (invocation: Invocation): boolean {
    sorted.add(this.pendingInvocations, invocation, sorter)
    return true
  }

  stopTrackingInvocation (invocation: Invocation): boolean {
    const invIdx = this.pendingInvocations.indexOf(invocation)
    if (invIdx > -1) {
      this.pendingInvocations.splice(invIdx, 1)
      return true
    }

    return false
  }

  triggeredJobs (): number {
    return this.triggeredJobsCount
  }

  setTriggeredJobs (triggeredJob: number): void {
    this.triggeredJobsCount = triggeredJob
  }

  deleteFromSchedule (): void {
    deleteScheduledJob(this.name)
  }

  cancel (reschedule: boolean = false): boolean {
    let inv: Invocation
    let newInv: Invocation | null
    const newInvs: Invocation[] = []

    for (let j = 0; j < this.pendingInvocations.length; j++) {
      inv = this.pendingInvocations[j]

      cancelInvocation(inv)

      if (
        reschedule &&
        'recurs' in inv.recurrenceRule &&
        inv.recurrenceRule.recurs
      ) {
        newInv = scheduleNextRecurrence(
          inv.recurrenceRule,
          this,
          inv.fireDate,
          inv.endDate
        )
        if (newInv !== null) {
          newInvs.push(newInv)
        }
      }
    }

    this.pendingInvocations = []

    for (let k = 0; k < newInvs.length; k++) {
      this.trackInvocation(newInvs[k])
    }

    // remove from scheduledJobs if reschedule === false
    if (!reschedule) {
      this.deleteFromSchedule()
    }

    return true
  }

  cancelNext (reschedule: boolean = true): boolean {
    if (!this.pendingInvocations.length) {
      return false
    }

    let newInv: Invocation | null
    const nextInv = this.pendingInvocations.shift()!

    cancelInvocation(nextInv)

    if (
      reschedule &&
      'recurs' in nextInv.recurrenceRule &&
      nextInv.recurrenceRule.recurs
    ) {
      newInv = scheduleNextRecurrence(
        nextInv.recurrenceRule,
        this,
        nextInv.fireDate,
        nextInv.endDate
      )
      if (newInv !== null) {
        this.trackInvocation(newInv)
      }
    }

    return true
  }

  reschedule (spec: string | Date | RecurrenceRule | RecurrenceSpec | ScheduleSpec): boolean {
    let inv: Invocation
    const invocationsToCancel = this.pendingInvocations.slice()

    for (let j = 0; j < invocationsToCancel.length; j++) {
      inv = invocationsToCancel[j]
      cancelInvocation(inv)
    }

    this.pendingInvocations = []

    if (this.schedule(spec)) {
      this.setTriggeredJobs(0)
      return true
    } else {
      this.pendingInvocations = invocationsToCancel
      return false
    }
  }

  nextInvocation (): Date | null {
    if (!this.pendingInvocations.length) {
      return null
    }
    return this.pendingInvocations[0].fireDate as Date
  }

  invoke (fireDate?: Date): unknown {
    this.setTriggeredJobs(this.triggeredJobs() + 1)
    return this.job(fireDate)
  }

  runOnDate (date: Date): boolean {
    return this.schedule(date)
  }

  schedule (spec: string | Date | RecurrenceRule | RecurrenceSpec | ScheduleSpec): boolean {
    let success = false
    let inv: Invocation | null
    let start: CronDate | undefined
    let end: CronDate | undefined
    let tz: string | undefined

    // save passed-in value before 'spec' is replaced
    if (typeof spec === 'object' && 'tz' in spec) {
      tz = spec.tz
    }

    if (typeof spec === 'object' && 'rule' in spec) {
      start = spec.start ? new CronDate(new Date(spec.start), tz) : undefined
      end = spec.end ? new CronDate(new Date(spec.end), tz) : undefined
      spec = spec.rule

      if (start) {
        if (!isValidDate(start.toDate()) || start.getTime() < Date.now()) {
          start = undefined
        }
      }

      if (end && !isValidDate(end.toDate())) {
        end = undefined
      }
    }

    try {
      const res: CronExpr = CronExpressionParser.parse(spec as string, {
        currentDate: start?.toDate(),
        tz,
      })
      // Add recurs property for cron expressions so they continue scheduling
      // Using Object.defineProperty to add the property with proper typing
      Object.defineProperty(res, 'recurs', {
        value: true,
        writable: true,
        enumerable: false,
        configurable: true,
      })
      inv = scheduleNextRecurrence(res, this, start, end)
      if (inv !== null) {
        success = this.trackInvocation(inv)
      }
    } catch (err) {
      const type = typeof spec
      if (type === 'string' || type === 'number') {
        spec = new Date(spec as string | number)
      }

      if (spec instanceof Date && isValidDate(spec)) {
        const cronDate = new CronDate(spec)
        this.isOneTimeJob = true
        if (cronDate.getTime() >= Date.now()) {
          inv = new Invocation(this, cronDate)
          scheduleInvocation(inv)
          success = this.trackInvocation(inv)
        }
      } else if (type === 'object') {
        this.isOneTimeJob = false
        let rule: RecurrenceRule

        if (!(spec instanceof RecurrenceRule)) {
          rule = new RecurrenceRule()
          const specObj = spec as RecurrenceSpec

          if ('year' in specObj) {
            rule.year = specObj.year ?? null
          }
          if ('month' in specObj) {
            rule.month = specObj.month ?? null
          }
          if ('date' in specObj) {
            rule.date = specObj.date ?? null
          }
          if ('dayOfWeek' in specObj) {
            rule.dayOfWeek = specObj.dayOfWeek ?? null
          }
          if ('hour' in specObj) {
            rule.hour = specObj.hour ?? null
          }
          if ('minute' in specObj) {
            rule.minute = specObj.minute ?? null
          }
          if ('second' in specObj) {
            rule.second = specObj.second ?? null
          }
        } else {
          rule = spec
        }

        rule.tz = tz
        inv = scheduleNextRecurrence(rule, this, start, end)
        if (inv !== null) {
          success = this.trackInvocation(inv)
        }
      }
    }

    scheduledJobs[this.name] = this
    return success
  }
}

function deleteScheduledJob (name: string): void {
  if (name) {
    delete scheduledJobs[name]
  }
}
