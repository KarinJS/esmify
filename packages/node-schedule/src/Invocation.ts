import {
  CronDate,
  type CronExpression as CronExpr,
} from '@karinjs/cron-parser'
import type { Job } from './Job'
import * as lt from './utils/longTimeout'
import * as sorted from './utils/sortedArray'

export const invocations: Invocation[] = []
let currentInvocation: Invocation | null = null

/* Invocation object */
export class Invocation {
  job: Job
  fireDate: Date | CronDate
  endDate?: Date | CronDate
  recurrenceRule: RecurrenceRule | CronExpr
  timerID: ReturnType<typeof lt.setTimeout> | null = null

  constructor (
    job: Job,
    fireDate: Date | CronDate,
    recurrenceRule?: RecurrenceRule | CronExpr,
    endDate?: Date | CronDate
  ) {
    this.job = job
    this.fireDate = fireDate
    this.endDate = endDate
    this.recurrenceRule = recurrenceRule || DoesntRecur
  }
}

export function sorter (a: Invocation, b: Invocation): number {
  return a.fireDate.getTime() - b.fireDate.getTime()
}

/* Range object */
export class Range {
  start: number
  end: number
  step: number

  constructor (start?: number, end?: number, step?: number) {
    this.start = start ?? 0
    this.end = end ?? 60
    this.step = step ?? 1
  }

  contains (val: number): boolean {
    if (this.step === null || this.step === 1) {
      return val >= this.start && val <= this.end
    } else {
      for (let i = this.start; i < this.end; i += this.step) {
        if (i === val) {
          return true
        }
      }

      return false
    }
  }
}

/* RecurrenceRule object */
/*
  Interpreting each property:
  null - any value is valid
  number - fixed value
  Range - value must fall in range
  array - value must validate against any item in list

  NOTE: Cron months are 1-based, but RecurrenceRule months are 0-based.
*/
// Exported types for API compatibility
export type Recurrence = number | Range | string
export type RecurrenceSegment = Recurrence | Recurrence[]
export type Timezone = string

// Internal types
type RecurrenceValue = number | Range | (number | Range)[] | null

export class RecurrenceRule {
  recurs: boolean = true
  year: RecurrenceValue = null
  month: RecurrenceValue = null
  date: RecurrenceValue = null
  dayOfWeek: RecurrenceValue = null
  hour: RecurrenceValue = null
  minute: RecurrenceValue = null
  second: RecurrenceValue = null
  tz?: string

  constructor (
    year?: RecurrenceValue,
    month?: RecurrenceValue,
    date?: RecurrenceValue,
    dayOfWeek?: RecurrenceValue,
    hour?: RecurrenceValue,
    minute?: RecurrenceValue,
    second?: RecurrenceValue,
    tz?: Timezone
  ) {
    this.year = year ?? null
    this.month = month ?? null
    this.date = date ?? null
    this.dayOfWeek = dayOfWeek ?? null
    this.hour = hour ?? null
    this.minute = minute ?? null
    this.second = second ?? 0
    this.tz = tz
  }

  isValid (): boolean {
    function isValidType (num: RecurrenceValue): boolean {
      if (Array.isArray(num)) {
        return num.every((e) => isValidType(e))
      }
      return !(Number.isNaN(Number(num)) && !(num instanceof Range))
    }

    if (this.month !== null) {
      if (typeof this.month === 'number' && (this.month < 0 || this.month > 11)) {
        return false
      }
      if (!isValidType(this.month)) {
        return false
      }
    }
    if (this.dayOfWeek !== null) {
      if (typeof this.dayOfWeek === 'number' && (this.dayOfWeek < 0 || this.dayOfWeek > 6)) {
        return false
      }
      if (!isValidType(this.dayOfWeek)) {
        return false
      }
    }
    if (this.hour !== null) {
      if (typeof this.hour === 'number' && (this.hour < 0 || this.hour > 23)) {
        return false
      }
      if (!isValidType(this.hour)) {
        return false
      }
    }
    if (this.minute !== null) {
      if (typeof this.minute === 'number' && (this.minute < 0 || this.minute > 59)) {
        return false
      }
      if (!isValidType(this.minute)) {
        return false
      }
    }
    if (this.second !== null) {
      if (typeof this.second === 'number' && (this.second < 0 || this.second > 59)) {
        return false
      }
      if (!isValidType(this.second)) {
        return false
      }
    }
    if (this.date !== null) {
      if (!isValidType(this.date)) {
        return false
      }
      if (typeof this.date === 'number') {
        switch (this.month) {
          case 3:
          case 5:
          case 8:
          case 10:
            if (this.date < 1 || this.date > 30) {
              return false
            }
            break
          case 1:
            if (this.date < 1 || this.date > 29) {
              return false
            }
            break
          default:
            if (this.date < 1 || this.date > 31) {
              return false
            }
        }
      }
    }
    return true
  }

  nextInvocationDate (base: Date | CronDate): Date | null {
    const next = this._nextInvocationDate(base)
    return next ? next.toDate() : null
  }

  _nextInvocationDate (base?: Date | CronDate): CronDate | null {
    base = base instanceof CronDate || base instanceof Date ? base : new Date()
    if (!this.recurs) {
      return null
    }

    if (!this.isValid()) {
      return null
    }

    const now = new CronDate(Date.now(), this.tz)
    let fullYear = now.getFullYear()
    if (
      this.year !== null &&
      typeof this.year === 'number' &&
      this.year < fullYear
    ) {
      return null
    }

    const next = new CronDate(base.getTime(), this.tz)
    next.addSecond()

    while (true) {
      if (this.year !== null) {
        fullYear = next.getFullYear()
        if (typeof this.year === 'number' && this.year < fullYear) {
          return null
        }

        if (!recurMatch(fullYear, this.year)) {
          next.addYear()
          next.setMonth(0)
          next.setDate(1)
          next.setHours(0)
          next.setMinutes(0)
          next.setSeconds(0)
          continue
        }
      }
      if (this.month !== null && !recurMatch(next.getMonth(), this.month)) {
        next.addMonth()
        continue
      }
      if (this.date !== null && !recurMatch(next.getDate(), this.date)) {
        next.addDay()
        continue
      }
      if (
        this.dayOfWeek !== null &&
        !recurMatch(next.getDay(), this.dayOfWeek)
      ) {
        next.addDay()
        continue
      }
      if (this.hour !== null && !recurMatch(next.getHours(), this.hour)) {
        next.addHour()
        continue
      }
      if (this.minute !== null && !recurMatch(next.getMinutes(), this.minute)) {
        next.addMinute()
        continue
      }
      if (this.second !== null && !recurMatch(next.getSeconds(), this.second)) {
        next.addSecond()
        continue
      }

      break
    }

    return next
  }
}

/* DoesntRecur rule */
const DoesntRecur = new RecurrenceRule()
DoesntRecur.recurs = false

function recurMatch (val: number, matcher: RecurrenceValue): boolean {
  if (matcher === null) {
    return true
  }

  if (typeof matcher === 'number') {
    return val === matcher
  } else if (typeof matcher === 'string') {
    return val === Number(matcher)
  } else if (matcher instanceof Range) {
    return matcher.contains(val)
  } else if (Array.isArray(matcher)) {
    for (let i = 0; i < matcher.length; i++) {
      if (recurMatch(val, matcher[i])) {
        return true
      }
    }
  }

  return false
}

/* Date-based scheduler */
function runOnDate (
  date: Date | CronDate,
  job: () => void
): ReturnType<typeof lt.setTimeout> {
  const now = Date.now()
  const then = date.getTime()

  return lt.setTimeout(function () {
    if (then > Date.now()) {
      runOnDate(date, job)
    } else {
      job()
    }
  }, then < now ? 0 : then - now)
}

export function scheduleInvocation (invocation: Invocation): void {
  sorted.add(invocations, invocation, sorter)
  prepareNextInvocation()
  const date =
    invocation.fireDate instanceof CronDate
      ? invocation.fireDate.toDate()
      : invocation.fireDate
  invocation.job.emit('scheduled', date)
}

function prepareNextInvocation (): void {
  if (invocations.length > 0 && currentInvocation !== invocations[0]) {
    if (currentInvocation !== null) {
      lt.clearTimeout(currentInvocation.timerID!)
      currentInvocation.timerID = null
      currentInvocation = null
    }

    currentInvocation = invocations[0]

    const job = currentInvocation.job
    const cinv = currentInvocation
    currentInvocation.timerID = runOnDate(currentInvocation.fireDate, function () {
      currentInvocationFinished()

      if (job.callback) {
        job.callback()
      }

      if (
        'recurs' in cinv.recurrenceRule &&
        (cinv.recurrenceRule.recurs ||
          ('_endDate' in cinv.recurrenceRule &&
            cinv.recurrenceRule._endDate === null))
      ) {
        const inv = scheduleNextRecurrence(
          cinv.recurrenceRule,
          cinv.job,
          cinv.fireDate,
          cinv.endDate
        )
        if (inv !== null) {
          inv.job.trackInvocation(inv)
        }
      }

      job.stopTrackingInvocation(cinv)

      try {
        const result = job.invoke(
          cinv.fireDate instanceof CronDate
            ? cinv.fireDate.toDate()
            : cinv.fireDate
        )
        job.emit('run')
        job.running += 1

        if (result instanceof Promise) {
          result
            .then(function (value) {
              job.emit('success', value)
              job.running -= 1
            })
            .catch(function (err) {
              job.emit('error', err)
              job.running -= 1
            })
        } else {
          job.emit('success', result)
          job.running -= 1
        }
      } catch (err) {
        job.emit('error', err)
        job.running -= 1
      }

      if (job.isOneTimeJob) {
        job.deleteFromSchedule()
      }
    })
  }
}

function currentInvocationFinished (): void {
  invocations.shift()
  currentInvocation = null
  prepareNextInvocation()
}

export function cancelInvocation (invocation: Invocation): void {
  const idx = invocations.indexOf(invocation)
  if (idx > -1) {
    invocations.splice(idx, 1)
    if (invocation.timerID !== null) {
      lt.clearTimeout(invocation.timerID)
    }

    if (currentInvocation === invocation) {
      currentInvocation = null
    }

    invocation.job.emit('canceled', invocation.fireDate)
    prepareNextInvocation()
  }
}

/* Recurrence scheduler */
export function scheduleNextRecurrence (
  rule: RecurrenceRule | CronExpr,
  job: Job,
  prevDate?: Date | CronDate,
  endDate?: Date | CronDate
): Invocation | null {
  prevDate = prevDate instanceof CronDate ? prevDate : new CronDate()

  const date =
    rule instanceof RecurrenceRule
      ? rule._nextInvocationDate(prevDate)
      : rule.next()
  if (date === null) {
    return null
  }

  if (endDate instanceof CronDate && date.getTime() > endDate.getTime()) {
    return null
  }

  const inv = new Invocation(job, date, rule, endDate)
  scheduleInvocation(inv)

  return inv
}
