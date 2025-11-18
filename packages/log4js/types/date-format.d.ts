declare module 'date-format' {
  /**
   * 日期格式化函数
   * @param format - 日期格式字符串或日期对象
   * @param date - 要格式化的日期对象（可选）
   * @returns 格式化后的日期字符串
   */
  function asString (format: string, date?: Date): string
  function asString (date: Date): string

  /**
   * 解析日期字符串
   * @param pattern - 日期格式模式
   * @param str - 要解析的日期字符串
   * @param missingValuesDate - 缺失值的默认日期（可选）
   * @returns 解析后的日期对象
   */
  function parse (pattern: string, str: string, missingValuesDate?: Date): Date

  /**
   * 获取当前日期时间
   * @returns 当前日期对象
   */
  function now (): Date

  /** ISO8601 格式：yyyy-MM-ddThh:mm:ss.SSS */
  const ISO8601_FORMAT: string

  /** 带时区偏移的 ISO8601 格式：yyyy-MM-ddThh:mm:ss.SSSO */
  const ISO8601_WITH_TZ_OFFSET_FORMAT: string

  /** 日期时间格式：dd MM yyyy hh:mm:ss.SSS */
  const DATETIME_FORMAT: string

  /** 绝对时间格式：hh:mm:ss.SSS */
  const ABSOLUTETIME_FORMAT: string

  namespace dateFormat {
    export { asString, parse, now, ISO8601_FORMAT, ISO8601_WITH_TZ_OFFSET_FORMAT, DATETIME_FORMAT, ABSOLUTETIME_FORMAT }
  }

  export = dateFormat
}
