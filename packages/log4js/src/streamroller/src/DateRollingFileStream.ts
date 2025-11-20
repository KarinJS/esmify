import RollingFileWriteStream, { type RollingFileWriteStreamOptions } from './RollingFileWriteStream.js'

export interface DateRollingFileStreamOptions extends Omit<RollingFileWriteStreamOptions, 'pattern' | 'numBackups' | 'daysToKeep'> {
  /**
   * @deprecated Use numBackups instead
   */
  daysToKeep?: number
  /**
   * Number of backup files to keep
   */
  numBackups?: number
}

// just to adapt the previous version
class DateRollingFileStream extends RollingFileWriteStream {
  public mode: number

  constructor (filename: string, pattern?: string | DateRollingFileStreamOptions, options?: DateRollingFileStreamOptions) {
    if (pattern && typeof (pattern) === 'object') {
      options = pattern
      pattern = undefined
    }
    if (!options) {
      options = {}
    }
    const extendedOptions: RollingFileWriteStreamOptions = { ...options }
    if (!pattern) {
      pattern = 'yyyy-MM-dd'
    }
    extendedOptions.pattern = pattern
    if (!extendedOptions.numBackups && extendedOptions.numBackups !== 0) {
      if (!options.daysToKeep && options.daysToKeep !== 0) {
        extendedOptions.daysToKeep = 1
      } else {
        process.emitWarning(
          'options.daysToKeep is deprecated due to the confusion it causes when used ' +
          'together with file size rolling. Please use options.numBackups instead.',
          'DeprecationWarning', 'streamroller-DEP0001'
        )
      }
      // 修复：应该直接赋值 extendedOptions.daysToKeep，与官方版本逻辑一致
      extendedOptions.numBackups = extendedOptions.daysToKeep
    } else {
      extendedOptions.daysToKeep = extendedOptions.numBackups
    }
    super(filename, extendedOptions)
    this.mode = (this as any).options.mode
  }

  get theStream (): NodeJS.WritableStream {
    return (this as any).currentFileStream
  }
}

export default DateRollingFileStream
