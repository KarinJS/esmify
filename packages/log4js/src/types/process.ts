/**
 * 扩展 Node.js Process 类型以支持 log4js 自定义事件
 */
declare global {
  namespace NodeJS {
    interface Process {
      /**
       * 发射 log4js:pause 事件
       * @param event - 事件名称
       * @param isPaused - true 表示写入流已满需要暂停，false 表示可以恢复写入
       */
      emit (event: 'log4js:pause', isPaused: boolean): boolean

      /**
       * 监听 log4js:pause 事件
       * @param event - 事件名称
       * @param listener - 事件监听器，接收 isPaused 参数
       */
      on (event: 'log4js:pause', listener: (isPaused: boolean) => void): this

      /**
       * 监听 log4js:pause 事件（仅一次）
       * @param event - 事件名称
       * @param listener - 事件监听器，接收 isPaused 参数
       */
      once (event: 'log4js:pause', listener: (isPaused: boolean) => void): this
    }
  }
}

export { }
