/**
 * Long timeout utility
 * Handles timeouts longer than JavaScript's maximum timeout value (2^31-1 ms ≈ 24.8 days)
 * Simplified implementation - only includes setTimeout/clearTimeout (no setInterval)
 */

const TIMEOUT_MAX = 2147483647 // 2^31-1

class LongTimeout {
  private listener: () => void
  private after: number
  private timeout: ReturnType<typeof globalThis.setTimeout> | null = null

  constructor (listener: () => void, after: number) {
    this.listener = listener
    this.after = after
    this.start()
  }

  private start (): void {
    if (this.after <= TIMEOUT_MAX) {
      this.timeout = globalThis.setTimeout(this.listener, this.after)
    } else {
      this.timeout = globalThis.setTimeout(() => {
        this.after -= TIMEOUT_MAX
        this.start()
      }, TIMEOUT_MAX)
    }
  }

  close (): void {
    if (this.timeout) {
      globalThis.clearTimeout(this.timeout)
      this.timeout = null
    }
  }
}

/**
 * Set a timeout that can exceed JavaScript's maximum timeout value
 * @param listener - The function to call after the timeout
 * @param after - The delay in milliseconds
 * @returns A LongTimeout object that can be cleared
 */
export function setTimeout (listener: () => void, after: number): LongTimeout {
  return new LongTimeout(listener, after)
}

/**
 * Clear a long timeout
 * @param timer - The LongTimeout object to clear
 */
export function clearTimeout (timer: LongTimeout | null): void {
  if (timer) {
    timer.close()
  }
}
