// 灵感来源: https://github.com/tlrobinson/long-stack-traces
import util from 'util'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)

/**
 * 扩展对象方法,为回调函数中的错误提供增强的堆栈追踪。
 * 当回调接收到错误时,堆栈信息将包含调用该方法时的位置。
 *
 * @param object - 要扩展其方法的对象
 * @param property - 要扩展的方法名
 * @param pos - 回调函数参数在方法参数列表中的位置。
 *              负数表示从末尾开始计数 (-1 = 最后一个参数)。
 *              未指定时默认为 -1。
 *
 * @example
 * ```ts
 * class Database {
 *   query(sql: string, callback: (err: Error | null) => void) {
 *     // ... 实现
 *   }
 * }
 * extendTrace(Database.prototype, 'query', -1);
 * ```
 */
export function extendTrace (object: any, property: string, pos: number = -1): void {
  const old = object[property]
  object[property] = function (...args: any[]) {
    const error = new Error()
    const name = `${object.constructor.name}#${property}(${args.map(el => util.inspect(el, false, 0)).join(', ')
      })`

    let callbackPos = pos
    if (callbackPos < 0) callbackPos += args.length
    const cb = args[callbackPos]

    if (typeof cb === 'function') {
      args[callbackPos] = function replacement (...callbackArgs: any[]) {
        const err = callbackArgs[0]
        if (err?.stack && !(err as any).__augmented) {
          err.stack = filter(err).join('\n')
          err.stack += `\n--> in ${name}`
          err.stack += '\n' + filter(error).slice(1).join('\n');
          (err as any).__augmented = true
        }
        return cb.apply(this, callbackArgs)
      }
    }
    return old.apply(this, args)
  }
}

/**
 * 从错误堆栈中过滤掉 trace.ts 内部的行。
 *
 * @param error - 要过滤的错误对象
 * @returns 过滤后的堆栈行数组
 */
function filter (error: Error): string[] {
  return error.stack!.split('\n').filter((line: string) =>
    !line.includes(__filename)
  )
}
