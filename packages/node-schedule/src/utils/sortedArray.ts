/**
 * Sorted array utility functions
 * Inlined from sorted-array-functions package
 * Only includes functions actually used in the codebase
 */

export type CompareFn<T> = (a: T, b: T) => number

function defaultCmp<T> (a: T, b: T): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

/**
 * Add a value to a sorted array in the correct position
 * @param list - The sorted array
 * @param value - The value to add
 * @param cmp - Optional comparison function
 */
export function add<T> (list: T[], value: T, cmp?: CompareFn<T>): void {
  if (!cmp) cmp = defaultCmp

  let top = list.push(value) - 1

  while (top) {
    if (cmp(list[top - 1], value) < 0) return
    list[top] = list[top - 1]
    list[top - 1] = value
    top--
  }
}
