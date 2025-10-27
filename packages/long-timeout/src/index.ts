const TIMEOUT_MAX = 2147483647 // 2^31-1

export class Timeout {
  private listener: () => void
  private after: number
  private unreffed: boolean = false
  private timer!: NodeJS.Timeout

  constructor (listener: () => void, after: number) {
    this.listener = listener
    this.after = after
    this.start()
  }

  unref (): void {
    if (!this.unreffed) {
      this.unreffed = true
      this.timer.unref()
    }
  }

  ref (): void {
    if (this.unreffed) {
      this.unreffed = false
      this.timer.ref()
    }
  }

  start (): void {
    if (this.after <= TIMEOUT_MAX) {
      this.timer = globalThis.setTimeout(this.listener, this.after)
    } else {
      this.timer = globalThis.setTimeout(() => {
        this.after -= TIMEOUT_MAX
        this.start()
      }, TIMEOUT_MAX)
    }
    if (this.unreffed) {
      this.timer.unref()
    }
  }

  close (): void {
    globalThis.clearTimeout(this.timer)
  }
}

export class Interval {
  private listener: () => void
  private after: number
  private timeLeft: number
  private unreffed: boolean = false
  private timer!: NodeJS.Timeout

  constructor (listener: () => void, after: number) {
    this.listener = listener
    this.after = after
    this.timeLeft = after
    this.start()
  }

  unref (): void {
    if (!this.unreffed) {
      this.unreffed = true
      this.timer.unref()
    }
  }

  ref (): void {
    if (this.unreffed) {
      this.unreffed = false
      this.timer.ref()
    }
  }

  start (): void {
    if (this.timeLeft <= TIMEOUT_MAX) {
      this.timer = globalThis.setTimeout(() => {
        this.listener()
        this.timeLeft = this.after
        this.start()
      }, this.timeLeft)
    } else {
      this.timer = globalThis.setTimeout(() => {
        this.timeLeft -= TIMEOUT_MAX
        this.start()
      }, TIMEOUT_MAX)
    }
    if (this.unreffed) {
      this.timer.unref()
    }
  }

  close (): void {
    globalThis.clearTimeout(this.timer)
  }
}

export function setTimeout (listener: () => void, after: number): Timeout {
  return new Timeout(listener, after)
}

export function setInterval (listener: () => void, after: number): Interval {
  return new Interval(listener, after)
}

export function clearTimeout (timer: Timeout | Interval | null | undefined): void {
  if (timer) timer.close()
}

export const clearInterval = clearTimeout

export default {
  setTimeout,
  setInterval,
  clearTimeout,
  clearInterval,
  Timeout,
  Interval,
}
