import RollingFileWriteStream, { type RollingFileWriteStreamOptions } from './RollingFileWriteStream.js'

export interface RollingFileStreamOptions extends Omit<RollingFileWriteStreamOptions, 'maxSize' | 'numBackups'> {
  // Inherited options from RollingFileWriteStreamOptions
}

// just to adapt the previous version
class RollingFileStream extends RollingFileWriteStream {
  public backups: number
  public size: number

  constructor (filename: string, size?: number, backups?: number, options?: RollingFileStreamOptions) {
    if (!options) {
      options = {}
    }
    const extendedOptions: RollingFileWriteStreamOptions = { ...options }
    if (size) {
      extendedOptions.maxSize = size
    }
    if (!extendedOptions.numBackups && extendedOptions.numBackups !== 0) {
      if (!backups && backups !== 0) {
        backups = 1
      }
      extendedOptions.numBackups = backups
    }
    super(filename, extendedOptions)
    this.backups = extendedOptions.numBackups!
    this.size = extendedOptions.maxSize || 0
  }

  get theStream (): NodeJS.WritableStream {
    return (this as any).currentFileStream
  }
}

export default RollingFileStream
