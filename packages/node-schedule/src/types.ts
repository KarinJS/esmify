// Type definitions for node-schedule public API
import type { RecurrenceRule, Range } from './Invocation'

/**
 * The callback executed by a Job
 */
export type JobCallback = (fireDate?: Date) => void | Promise<unknown>

/**
 * The Spec that is used as params for schedule to decide when it needs to be run
 */
export type Spec =
  | RecurrenceRule
  | RecurrenceSpecDateRange
  | RecurrenceSpecObjLit
  | Date
  | string
  | number

/**
 * Recurrence rule specification using a date range and cron expression.
 */
export interface RecurrenceSpecDateRange {
  /**
   * Starting date in date range.
   */
  start?: Date | string | number
  /**
   * Ending date in date range.
   */
  end?: Date | string | number
  /**
   * Cron expression string.
   */
  rule: string
  /**
   * Timezone
   */
  tz?: string
}

/**
 * Recurrence rule specification using object literal syntax.
 */
export interface RecurrenceSpecObjLit {
  /**
   * Day of the month.
   */
  date?: number | Range | (number | Range)[] | null
  dayOfWeek?: number | Range | (number | Range)[] | null
  hour?: number | Range | (number | Range)[] | null
  minute?: number | Range | (number | Range)[] | null
  month?: number | Range | (number | Range)[] | null
  second?: number | Range | (number | Range)[] | null
  year?: number | Range | (number | Range)[] | null
  /**
   * Timezone
   */
  tz?: string
}
