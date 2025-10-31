declare module 'streamroller' {
  import { Writable } from 'node:stream'

  export class RollingFileStream extends Writable {
    constructor (
      filename: string,
      size?: number | string,
      backups?: number,
      options?: Record<string, unknown>
    )
  }

  export class DateRollingFileStream extends Writable {
    constructor (
      filename: string,
      pattern?: string,
      options?: Record<string, unknown>
    )
  }
}
