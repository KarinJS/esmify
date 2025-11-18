import { configuration } from './configuration'

/** 日志颜色类型 */
type Colour = typeof validColours[number]

/** 内置日志级别类型 */
type Levels = typeof levels

/**
 * 每个日志静态方法对应的实例
 */
interface LveelMethods {
  /** 日志级别数值 */
  level: number
  /** 日志级别字符串 */
  levelStr: string
  /** 日志级别颜色 */
  colour: Colour
  /** 返回日志级别的字符串表示 */
  toString (): string
  /** 判断当前级别是否小于或等于另一个级别 */
  isLessThanOrEqualTo: (otherLevel: LveelMethods | string) => boolean
  /** 判断当前级别是否大于或等于另一个级别 */
  isGreaterThanOrEqualTo: (otherLevel: LveelMethods | string) => boolean
  /** 判断当前级别是否等于另一个级别 */
  isEqualTo: (otherLevel: LveelMethods | string) => boolean
}

/** 有效的日志颜色列表 */
const validColours = [
  'white',
  'grey',
  'black',
  'blue',
  'cyan',
  'green',
  'magenta',
  'red',
  'yellow',
] as const

/**
 * 创建日志级别实例
 * @param level - 日志级别数值
 * @param levelStr - 日志级别字符串
 * @param colour - 日志级别颜色
 * @returns 日志级别实例
 */
const createLevel = (
  level: number,
  levelStr: string,
  colour: Colour
): LveelMethods => ({
  level,
  levelStr,
  colour,
  toString () {
    return this.levelStr
  },
  /**
   * 判断当前级别是否小于或等于另一个级别
   * @param otherLevel - 要比较的日志级别
   * @returns 如果当前级别小于或等于另一个级别则返回 true
   */
  isLessThanOrEqualTo (otherLevel: LveelMethods | string) {
    if (typeof otherLevel === 'string') {
      const level = Level.getLevel(otherLevel)
      return this.level <= level.level
    }
    return this.level <= otherLevel.level
  },

  /**
   * 判断当前级别是否大于或等于另一个级别
   * @param otherLevel - 要比较的日志级别
   * @returns 如果当前级别大于或等于另一个级别则返回 true
   */
  isGreaterThanOrEqualTo (otherLevel: LveelMethods | string) {
    if (typeof otherLevel === 'string') {
      const level = Level.getLevel(otherLevel)
      return this.level >= level.level
    }
    return this.level >= otherLevel.level
  },

  /**
   * 判断当前级别是否等于另一个级别
   * @param otherLevel - 要比较的日志级别
   * @returns 如果当前级别等于另一个级别则返回 true
   */
  isEqualTo (otherLevel: LveelMethods | string) {
    if (typeof otherLevel === 'string') {
      const level = Level.getLevel(otherLevel)
      return this.level === level.level
    }
    return this.level === otherLevel.level
  },
})

/**
 * 自定义级别配置类型
 */
type LevelConfig<T extends string = string> = Record<T, { value: number; colour: Colour }>

/**
 * 从级别配置中提取级别名称并转换为大写
 */
type ExtractLevelNames<T extends LevelConfig> = {
  [K in keyof T as Uppercase<K & string>]: LveelMethods
}

/**
 * 日志级别类
 * @description 这个没有内置类型 不应该导出
 */
class Level {
  /** 所有已定义的日志级别列表 */
  static levels: LveelMethods[] = []

  /**
   * 将给定的字符串转换为对应的日志级别
   * @param - 日志级别的字符串值或 Log4js.Level 实例 可选
   * @param - 默认日志级别 必须传入
   * @description 必须传入 defaultLevel 参数
   * @return 日志级别实例
   */
  static getLevel (sArg: LveelMethods | string | undefined, defaultLevel: LveelMethods): LveelMethods
  /**
   * 将给定的字符串转换为对应的日志级别
   * @param - 日志级别的字符串值或 Log4js.Level 实例 必须传入
   * @param - 默认日志级别，当没有字符串表示时使用 可选
   * @return 日志级别实例
   */
  static getLevel (sArg: LveelMethods | string, defaultLevel?: LveelMethods): LveelMethods

  /**
   * 将给定的字符串转换为对应的日志级别
   * @param - 日志级别的字符串值或 Log4js.Level 实例
   * @param - 默认日志级别，当没有字符串表示时使用
   * @return 日志级别实例
   */
  static getLevel (sArg: LveelMethods | string, defaultLevel?: LveelMethods): LveelMethods {
    if (!sArg) {
      return defaultLevel!
    }

    if (typeof sArg === 'object' && 'level' in sArg && 'levelStr' in sArg) {
      return sArg
    }

    const key = sArg.toString().toUpperCase()

    if (key in Level) {
      return (Level as Record<string, any>)[key]
    }

    if (defaultLevel) {
      return defaultLevel
    }

    throw new Error(`未知的日志级别: ${sArg}`)
  }

  /**
   * 添加自定义日志级别（带类型推断）
   * @param customLevels - 自定义日志级别配置对象
   * @returns 带有新增级别类型的 Level 类
   * @example
   * ```ts
   * const MyLevel = Level.addLevels({
   *   verbose: { value: 1000, colour: 'cyan' },
   *   critical: { value: 60000, colour: 'red' }
   * })
   * // 现在可以使用 MyLevel.VERBOSE 和 MyLevel.CRITICAL，并且有完整的类型提示
   * ```
   */
  static addLevels<This, T extends LevelConfig> (
    this: This,
    customLevels: T
  ): This & ExtractLevelNames<T> {
    if (!customLevels) return this as This & ExtractLevelNames<T>

    const levels = Object.keys(customLevels)
    levels.forEach((l) => {
      /** 将级别名称转换为大写 */
      const levelStr = l.toUpperCase()

      /** 创建新的日志级别实例 */
      const data = Level.createLevel(
        customLevels[l].value,
        levelStr,
        customLevels[l].colour
      )

      /** 找到现有级别的索引 */
      const existingLevelIndex = Level.levels.findIndex(
        (lvl) => lvl.levelStr === levelStr
      )

      /** 如果级别已存在，则更新它，否则添加新级别 */
      if (existingLevelIndex > -1) {
        Level.levels[existingLevelIndex] = data
      } else {
        Level.levels.push(data)
      }
    })

    Level.levels.sort((a, b) => a.level - b.level)

    return this as This & ExtractLevelNames<T>
  }

  /**
   * 创建日志级别实例的私有方法
   * @description 同时挂载到 Level 类上
   */
  private static createLevel (
    level: number,
    levelStr: string,
    colour: (typeof validColours)[number]
  ) {
    const data = createLevel(
      level,
      levelStr,
      colour
    );

    (Level as Record<string, any>)[levelStr] = data
    return data
  }
}

/**
 * 内置日志级别实例
 */
const levels = Level.addLevels({
  ALL: { value: Number.MIN_VALUE, colour: 'grey' },
  TRACE: { value: 5000, colour: 'blue' },
  DEBUG: { value: 10000, colour: 'cyan' },
  INFO: { value: 20000, colour: 'green' },
  WARN: { value: 30000, colour: 'yellow' },
  ERROR: { value: 40000, colour: 'red' },
  FATAL: { value: 50000, colour: 'magenta' },
  MARK: { value: 9007199254740992, colour: 'grey' }, // 2^53
  OFF: { value: Number.MAX_VALUE, colour: 'grey' },
} as const)

/**
 * 配置监听器：验证自定义级别配置并将其添加到 Level 类
 */
configuration.addListener((config) => {
  const levelConfig = config.levels
  if (!levelConfig) return

  configuration.throwExceptionIf(
    config,
    configuration.not(configuration.anObject(levelConfig)),
    '日志级别配置必须是一个对象'
  )

  const newLevels = Object.keys(levelConfig)
  newLevels.forEach((l) => {
    configuration.throwExceptionIf(
      config,
      configuration.not(configuration.validIdentifier(l)),
      `日志级别名称 "${l}" 不是有效的标识符（必须以字母开头，只能包含 A-Z、a-z、0-9、_）`
    )
    configuration.throwExceptionIf(
      config,
      configuration.not(configuration.anObject(levelConfig[l])),
      `日志级别 "${l}" 必须是一个对象`
    )
    configuration.throwExceptionIf(
      config,
      configuration.not(levelConfig[l].value),
      `日志级别 "${l}" 必须有 'value' 属性`
    )
    configuration.throwExceptionIf(
      config,
      configuration.not(configuration.anInteger(levelConfig[l].value)),
      `日志级别 "${l}".value 必须是整数值`
    )
    configuration.throwExceptionIf(
      config,
      configuration.not(levelConfig[l].colour),
      `日志级别 "${l}" 必须有 'colour' 属性`
    )
    configuration.throwExceptionIf(
      config,
      configuration.not(validColours.indexOf(levelConfig[l].colour) > -1),
      `日志级别 "${l}".colour 必须是以下值之一：${validColours.join('、')}`
    )
  })
})

/**
 * 配置监听器：在配置中检测到自定义级别时，添加它们到 Level 类
 */
configuration.addListener((config) => {
  config.levels && Level.addLevels(config.levels)
})

export { levels, createLevel, Level as LevelClass }

export type {
  Levels,
  Colour,
  LevelConfig,
  LveelMethods,
  LveelMethods as Level,
}
