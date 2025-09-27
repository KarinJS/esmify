// date-format模块类型声明
declare module 'date-format' {
  interface DateFormat {
    asString (date: Date): string
    asString (format: string, date: Date): string
    ISO8601_FORMAT: string
    ISO8601_WITH_TZ_OFFSET_FORMAT: string
    ABSOLUTETIME_FORMAT: string
    DATETIME_FORMAT: string
    now (): Date
    parse (date: string, format?: string): Date
  }

  const dateFormat: DateFormat
  export = dateFormat
}
