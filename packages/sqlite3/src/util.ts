/**
 * 合并源类的原型方法到目标类
 * @param target 目标类
 * @param source 源类
 */
export const inherits = (target: any, source: any) => {
  for (const k in source.prototype) {
    target.prototype[k] = source.prototype[k]
  }
}
